import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import path from 'node:path';

/**
 * Serves stored product images under the `/uploads/*` public prefix using the
 * same directory resolution as LocalImageStorage (relative paths resolve from
 * the API process working directory). Only used as the static image host:
 * `Product.imageUrl` always stores these relative URLs.
 */
export function configureStaticAssets(app: NestExpressApplication): void {
  const config = app.get(ConfigService);
  const uploadDir = path.resolve(config.get<string>('UPLOAD_DIR', 'uploads') ?? 'uploads');

  app.useStaticAssets(uploadDir, {
    prefix: '/uploads/',
    index: false,
    // File names are server-generated UUIDs and their content never changes
    // once written, so images can be cached aggressively by the browser.
    maxAge: '1y',
    immutable: true,
  });
}