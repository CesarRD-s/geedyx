import { randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { access, mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageStorage } from './image-storage.js';

const STATIC_PREFIX = '/uploads';
const PRODUCTS_SUBDIR = 'products';

const PUBLIC_URL_PATTERN = /^\/uploads\/products\/([a-zA-Z0-9._-]+)$/;

export interface ImageStorageConfigReader {
  get(key: string, defaultValue?: string): string | undefined;
}

function isError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error;
}

/**
 * MVP implementation of ImageStorage that writes files to the local
 * filesystem. Files are stored under `<UPLOAD_DIR>/products/` and are
 * addressable over HTTP through the `/uploads/products/*` public prefix.
 *
 * File names are fully server-generated (`<uuid>.<validated-extension>`), the
 * original client file name is never used, and delete/exists only ever accept
 * URLs inside this namespace, so a stored value can not escape UPLOAD_DIR.
 */
export class LocalImageStorage implements ImageStorage {
  private readonly uploadDir: string;

  constructor(config: ImageStorageConfigReader) {
    const configured = config.get('UPLOAD_DIR', 'uploads') ?? 'uploads';
    this.uploadDir = path.resolve(configured);
  }

  async save(buffer: Buffer, extension: string): Promise<string> {
    const safeExtension = /^[a-z0-9]{1,8}$/.test(extension) ? extension : 'bin';
    const productsDir = path.join(this.uploadDir, PRODUCTS_SUBDIR);
    await mkdir(productsDir, { recursive: true });

    const filename = `${randomUUID()}.${safeExtension}`;
    const absolutePath = path.join(productsDir, filename);
    await writeFile(absolutePath, buffer, { flag: 'wx' });
    return `${STATIC_PREFIX}/${PRODUCTS_SUBDIR}/${filename}`;
  }

  async delete(publicUrl: string): Promise<void> {
    const absolutePath = this.publicUrlToAbsolutePath(publicUrl);
    if (!absolutePath) {
      return;
    }
    try {
      await unlink(absolutePath);
    } catch (error) {
      if (isError(error) && error.code === 'ENOENT') {
        return;
      }
      throw error;
    }
  }

  async exists(publicUrl: string): Promise<boolean> {
    const absolutePath = this.publicUrlToAbsolutePath(publicUrl);
    if (!absolutePath) {
      return false;
    }
    try {
      await access(absolutePath, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  private publicUrlToAbsolutePath(publicUrl: string): string | null {
    const match = PUBLIC_URL_PATTERN.exec(publicUrl);
    if (!match) {
      return null;
    }
    const filename = match[1];
    return path.join(this.uploadDir, PRODUCTS_SUBDIR, filename);
  }
}