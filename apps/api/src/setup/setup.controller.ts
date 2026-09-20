import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { SetupService } from './setup.service';
import { CreateOwnerDto } from './dto/create-owner.dto';
import type { RequestWithId } from '../http/request-id.middleware';

@Controller('setup')
export class SetupController {
  constructor(private readonly setupService: SetupService) {}

  @Get('status')
  getStatus() {
    return this.setupService.getStatus();
  }

  @Post('owner')
  @HttpCode(HttpStatus.CREATED)
  createOwner(
    @Body() dto: CreateOwnerDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: RequestWithId & Request,
  ) {
    return this.setupService.createOwner(dto, idempotencyKey, request.requestId);
  }
}
