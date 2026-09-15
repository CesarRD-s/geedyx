import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { FileAssetsService } from './file-assets.service.js';

@Controller('files')
export class FilesController {
  constructor(private readonly fileAssets: FileAssetsService) {}

  @Get(':id')
  async download(
    @Param('id') id: string,
    @Query('expires') expires: string | undefined,
    @Query('signature') signature: string | undefined,
    @Res() response: Response,
  ): Promise<void> {
    const file = await this.fileAssets.readAuthorized(id, expires, signature);
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Content-Length', file.sizeBytes);
    response.setHeader('Cache-Control', 'private, max-age=300');
    response.send(file.body);
  }
}
