import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { assertCsrf, CSRF_HEADER } from '../auth/csrf';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { SessionGuard } from '../auth/session.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import type { RequestWithId } from '../http/request-id.middleware';
import { PaginationDto } from '../http/pagination.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { IssueTemporaryPasswordDto } from './dto/issue-temporary-password.dto';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(SessionGuard, PermissionGuard)
export class UsersController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  @RequirePermission('users.read')
  listUsers(@Req() request: AuthenticatedRequest, @Query() dto: PaginationDto) {
    return this.usersService.listUsers(request.auth!.user.id, dto);
  }

  @Get('roles')
  @RequirePermission('roles.manage')
  listRoles(@Req() request: AuthenticatedRequest) {
    return this.usersService.listRoles(request.auth!.user.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('users.manage')
  createUser(
    @Body() dto: CreateUserDto,
    @Headers(CSRF_HEADER) csrfHeader: string | undefined,
    @Req() request: AuthenticatedRequest & RequestWithId & Request,
  ) {
    assertCsrf(request, csrfHeader, this.authService.getCsrfCookieName());
    return this.usersService.createUser(dto, request.auth!.user.id, request.requestId);
  }

  @Patch(':userId/status')
  @RequirePermission('users.manage')
  updateStatus(
    @Param('userId') userId: string,
    @Body() dto: UpdateUserStatusDto,
    @Headers(CSRF_HEADER) csrfHeader: string | undefined,
    @Req() request: AuthenticatedRequest & RequestWithId & Request,
  ) {
    assertCsrf(request, csrfHeader, this.authService.getCsrfCookieName());
    return this.usersService.updateStatus(
      request.auth!.user.id,
      userId,
      dto,
      request.requestId,
    );
  }

  @Patch(':userId/roles')
  @RequirePermission('roles.manage')
  updateRoles(
    @Param('userId') userId: string,
    @Body() dto: UpdateUserRolesDto,
    @Headers(CSRF_HEADER) csrfHeader: string | undefined,
    @Req() request: AuthenticatedRequest & RequestWithId & Request,
  ) {
    assertCsrf(request, csrfHeader, this.authService.getCsrfCookieName());
    return this.usersService.updateRoles(
      request.auth!.user.id,
      userId,
      dto,
      request.requestId,
    );
  }

  @Post(':userId/temporary-password')
  @RequirePermission('users.manage')
  issueTemporaryPassword(
    @Param('userId') userId: string,
    @Body() dto: IssueTemporaryPasswordDto,
    @Headers(CSRF_HEADER) csrfHeader: string | undefined,
    @Req() request: AuthenticatedRequest & RequestWithId & Request,
  ) {
    assertCsrf(request, csrfHeader, this.authService.getCsrfCookieName());
    return this.usersService.issueTemporaryPassword(
      request.auth!.user.id,
      userId,
      dto,
      request.requestId,
    );
  }

  @Get(':userId/sessions')
  @RequirePermission('sessions.read')
  listUserSessions(
    @Param('userId') userId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.authService.listSessions(request.auth!.user.id, userId);
  }

  @Post(':userId/sessions/:sessionId/revoke')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('sessions.revoke')
  revokeUserSession(
    @Param('userId') userId: string,
    @Param('sessionId') sessionId: string,
    @Headers(CSRF_HEADER) csrfHeader: string | undefined,
    @Req() request: AuthenticatedRequest & RequestWithId & Request,
  ) {
    assertCsrf(request, csrfHeader, this.authService.getCsrfCookieName());
    return this.authService.revokeManagedSession(
      request.auth!.user.id,
      userId,
      sessionId,
      request.requestId,
    );
  }
}
