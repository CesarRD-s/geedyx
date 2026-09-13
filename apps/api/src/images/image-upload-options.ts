import { BadRequestException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { ALLOWED_IMAGE_MIME_TYPES } from './image-formats.js';

export interface ImageUploadConfigReader {
  get(key: string, defaultValue?: string): string | undefined;
}

/**
 * Adapts the framework `ConfigService` to the minimal reader interface used by
 * the image upload configuration helpers.
 */
export function asImageUploadConfig(
  config: ConfigService,
): ImageUploadConfigReader {
  return {
    get(key, defaultValue) {
      if (defaultValue === undefined) {
        return config.get<string>(key);
      }
      return config.get<string>(key, defaultValue);
    },
  };
}

/**
 * Maximum accepted upload size in bytes, derived from the explicit
 * `MAX_IMAGE_SIZE_MB` environment variable (default 5). The limit is always
 * configured explicitly; a missing/invalid value falls back to 5 MB instead of
 * relying on an unknown framework default.
 */
export function getMaxImageBytes(config: ImageUploadConfigReader): number {
  const raw = config.get('MAX_IMAGE_SIZE_MB', '5') ?? '5';
  const megabytes = Number(raw);
  const safeMegabytes =
    Number.isFinite(megabytes) && megabytes >= 1 ? megabytes : 5;
  return Math.floor(safeMegabytes * 1024 * 1024);
}

interface MulterFile {
  mimetype: string;
}

type MulterFileFilterCallback = (
  error: Error | null,
  acceptFile: boolean,
) => void;

/**
 * First validation gate at the HTTP layer (multer `fileFilter`): only files
 * whose declared MIME type is one of the allowed image types reach the
 * service. The actual content is verified separately by magic-byte sniffing in
 * ProductsService, so this gate is not trusted on its own.
 */
export function imageMimeFileFilter(
  _request: unknown,
  file: MulterFile,
  callback: MulterFileFilterCallback,
): void {
  if (ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
    callback(null, true);
    return;
  }
  callback(
    new BadRequestException('Only JPEG, PNG and WebP images are allowed'),
    false,
  );
}
