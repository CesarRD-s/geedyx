import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import {
  asImageUploadConfig,
  getMaxImageBytes,
  imageMimeFileFilter,
} from '../images/image-upload-options.js';
import { ImagesModule } from '../images/images.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';

@Module({
  imports: [
    PrismaModule,
    ImagesModule,
    // Multer options are merged into the FileInterceptor at runtime, so the
    // explicit MAX_IMAGE_SIZE_MB limit and MIME gate are enforced while the
    // body streams in (before the file is fully buffered).
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        limits: { fileSize: getMaxImageBytes(asImageUploadConfig(config)) },
        fileFilter: imageMimeFileFilter,
      }),
    }),
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}