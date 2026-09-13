import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/authorization/authenticated-request.js';
import { PermissionCode } from '../auth/authorization/permissions.js';
import { RequirePermissions } from '../auth/authorization/require-permissions.decorator.js';
import { AccountStatusGuard } from '../auth/guards/account-status.guard.js';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { ListUsersDto } from './dto/list-users.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UsersService } from './users.service.js';

@Controller('users')
@UseGuards(SessionAuthGuard, AccountStatusGuard, PermissionsGuard)
@ApiCookieAuth()
@RequirePermissions(PermissionCode.UsersRead)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@Req() request: AuthenticatedRequest, @Query() query: ListUsersDto) {
    return this.usersService.findAll(request.user.companyId, query);
  }

  @Get('roles')
  listRoles(@Req() request: AuthenticatedRequest) {
    return this.usersService.listAssignableRoles(request.user.companyId);
  }

  @Get(':id')
  findOne(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.usersService.findOne(request.user.companyId, id);
  }

  @Post()
  @RequirePermissions(PermissionCode.UsersManage)
  @HttpCode(HttpStatus.CREATED)
  create(@Req() request: AuthenticatedRequest, @Body() dto: CreateUserDto) {
    return this.usersService.create(request.user.companyId, dto);
  }

  @Patch(':id')
  @RequirePermissions(PermissionCode.UsersManage)
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(request.user.companyId, request.user.id, id, dto);
  }
}
