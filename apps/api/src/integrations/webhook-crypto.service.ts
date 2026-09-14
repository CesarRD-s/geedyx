import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type PrismaBytes = Uint8Array<ArrayBuffer>;
export interface EncryptedWebhookSecret {
  ciphertext: PrismaBytes;
  nonce: PrismaBytes;
  authTag: PrismaBytes;
}

@Injectable()
export class WebhookCryptoService {
  constructor(private readonly config: ConfigService) {}

  encrypt(secret: string): EncryptedWebhookSecret {
    const nonce = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key(), nonce);
    return {
      ciphertext: bytes(
        Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]),
      ),
      nonce: bytes(nonce),
      authTag: bytes(cipher.getAuthTag()),
    };
  }

  decrypt(secret: EncryptedWebhookSecret): string {
    const decipher = createDecipheriv('aes-256-gcm', this.key(), secret.nonce);
    decipher.setAuthTag(secret.authTag);
    return Buffer.concat([
      decipher.update(secret.ciphertext),
      decipher.final(),
    ]).toString('utf8');
  }

  sign(timestamp: string, payload: string, secret: string): string {
    return createHmac('sha256', secret)
      .update(`${timestamp}.${payload}`)
      .digest('hex');
  }

  verify(
    timestamp: string,
    payload: string,
    signature: string,
    secret: string,
  ): boolean {
    const expected = Buffer.from(this.sign(timestamp, payload, secret), 'hex');
    const received = Buffer.from(signature, 'hex');
    return (
      expected.length === received.length && timingSafeEqual(expected, received)
    );
  }

  private key(): Buffer {
    const value = this.config.get<string>('WEBHOOK_ENCRYPTION_KEY');
    if (!value)
      throw new Error('WEBHOOK_ENCRYPTION_KEY is required for webhooks');
    const key = Buffer.from(value, 'base64');
    if (key.length !== 32)
      throw new Error('WEBHOOK_ENCRYPTION_KEY must be a base64 256-bit key');
    return key;
  }
}

function bytes(value: Uint8Array): PrismaBytes {
  const output = new Uint8Array(new ArrayBuffer(value.byteLength));
  output.set(value);
  return output;
}
