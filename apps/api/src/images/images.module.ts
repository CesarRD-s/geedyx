import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { asImageUploadConfig } from './image-upload-options.js';
import { IMAGE_STORAGE } from './image-storage.js';
import { LocalImageStorage } from './local-image-storage.js';

/**
 * Provides the `IMAGE_STORAGE` token. The local filesystem is the MVP
 * implementation; swapping to remote storage later only changes this provider.
 */
@Module({
  providers: [
    {
      provide: IMAGE_STORAGE,
      useFactory: (config: ConfigService) =>
        new LocalImageStorage(asImageUploadConfig(config)),
      inject: [ConfigService],
    },
  ],
  exports: [IMAGE_STORAGE],
})
export class ImagesModule {}