import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module.js';
import { FileAssetsService } from './file-assets.service.js';
import { FilesController } from './files.controller.js';
import { FILE_STORAGE } from './file-storage.js';
import { LocalFileStorage } from './local-file-storage.js';
import { S3FileStorage } from './s3-file-storage.js';
import type { FileStorage } from './file-storage.js';

function storageProvider(config: ConfigService): FileStorage {
  const provider = config.getOrThrow<'local' | 's3'>('FILE_STORAGE_PROVIDER');
  if (provider === 'local') {
    return new LocalFileStorage(config.getOrThrow<string>('UPLOAD_DIR'));
  }
  return new S3FileStorage({
    endpoint: config.getOrThrow<string>('S3_ENDPOINT'),
    region: config.getOrThrow<string>('S3_REGION'),
    bucket: config.getOrThrow<string>('S3_BUCKET'),
    accessKeyId: config.getOrThrow<string>('S3_ACCESS_KEY_ID'),
    secretAccessKey: config.getOrThrow<string>('S3_SECRET_ACCESS_KEY'),
  });
}

@Module({
  imports: [PrismaModule],
  controllers: [FilesController],
  providers: [
    FileAssetsService,
    {
      provide: FILE_STORAGE,
      useFactory: storageProvider,
      inject: [ConfigService],
    },
  ],
  exports: [FileAssetsService],
})
export class FilesModule {}
