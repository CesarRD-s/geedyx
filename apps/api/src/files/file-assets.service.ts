import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileAssetStatus } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { FILE_STORAGE } from './file-storage.js';
import type { FileStorage } from './file-storage.js';

const DEFAULT_FILE_URL_TTL_MS = 10 * 60 * 1_000;

export interface PendingFileAsset {
  storageProvider: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
}

function durationToMilliseconds(value: string): number {
  const match = /^([1-9]\d*)\s*(s|m|h|d)$/i.exec(value);
  if (!match) {
    return DEFAULT_FILE_URL_TTL_MS;
  }
  const quantity = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers: Record<string, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return quantity * (multipliers[unit] ?? DEFAULT_FILE_URL_TTL_MS);
}

@Injectable()
export class FileAssetsService {
  private readonly signingSecret: string;
  private readonly urlTtlMs: number;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(FILE_STORAGE) private readonly storage: FileStorage,
    config: ConfigService,
  ) {
    this.signingSecret = config.getOrThrow<string>('FILE_URL_SIGNING_SECRET');
    this.urlTtlMs = durationToMilliseconds(
      config.get<string>('FILE_URL_TTL', '10m'),
    );
  }

  async storeImage(
    companyId: string,
    body: Buffer,
    mimeType: string,
    extension: string,
  ): Promise<PendingFileAsset> {
    const key = `companies/${companyId}/images/${randomUUID()}.${extension}`;
    try {
      await this.storage.put(key, body, mimeType);
    } catch (error) {
      throw new InternalServerErrorException('Could not store the image', {
        cause: error instanceof Error ? error : undefined,
      });
    }
    return {
      storageProvider: this.storage.provider,
      storageKey: key,
      mimeType,
      sizeBytes: body.byteLength,
      checksum: createHash('sha256').update(body).digest('hex'),
    };
  }

  async discardPending(asset: PendingFileAsset): Promise<void> {
    await this.storage.delete(asset.storageKey);
  }

  accessUrl(assetId: string): string {
    const expiresAt = Date.now() + this.urlTtlMs;
    const signature = this.signature(assetId, expiresAt);
    return `/api/v1/files/${encodeURIComponent(assetId)}?expires=${expiresAt}&signature=${signature}`;
  }

  async readAuthorized(
    id: string,
    rawExpires: string | undefined,
    signature: string | undefined,
  ): Promise<{ body: Buffer; mimeType: string; sizeBytes: number }> {
    const expiresAt = Number(rawExpires);
    if (
      !Number.isSafeInteger(expiresAt) ||
      expiresAt < Date.now() ||
      !signature ||
      !this.signatureMatches(id, expiresAt, signature)
    ) {
      throw new NotFoundException('File not found');
    }
    const asset = await this.prisma.fileAsset.findFirst({
      where: { id, status: FileAssetStatus.ACTIVE },
      select: { storageKey: true, mimeType: true, sizeBytes: true },
    });
    if (!asset) {
      throw new NotFoundException('File not found');
    }
    try {
      return {
        body: await this.storage.read(asset.storageKey),
        mimeType: asset.mimeType,
        sizeBytes: asset.sizeBytes,
      };
    } catch (error) {
      throw new InternalServerErrorException('Could not retrieve the file', {
        cause: error instanceof Error ? error : undefined,
      });
    }
  }

  async deleteAsset(id: string): Promise<void> {
    const asset = await this.prisma.fileAsset.findFirst({
      where: { id, status: FileAssetStatus.ACTIVE },
      select: { id: true, storageKey: true },
    });
    if (!asset) {
      return;
    }
    await this.storage.delete(asset.storageKey);
    await this.prisma.fileAsset.update({
      where: { id: asset.id },
      data: { status: FileAssetStatus.DELETED, deletedAt: new Date() },
    });
  }

  private signature(assetId: string, expiresAt: number): string {
    return createHmac('sha256', this.signingSecret)
      .update(`${assetId}:${expiresAt}`)
      .digest('base64url');
  }

  private signatureMatches(
    assetId: string,
    expiresAt: number,
    signature: string,
  ): boolean {
    const expected = Buffer.from(this.signature(assetId, expiresAt));
    const received = Buffer.from(signature);
    return (
      expected.length === received.length &&
      timingSafeEqual(expected, received)
    );
  }
}
