import argon2 from 'argon2';
import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { timingSafeEqual } from 'node:crypto';
import type { UserModel } from '../generated/prisma/models.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { durationToMs } from './duration.js';
import { LoginDto } from './dto/login.dto.js';
import { SetupDto } from './dto/setup.dto.js';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  companyId: string;
}

export interface AuthSession {
  user: AuthUser;
  token: string;
  cookieMaxAge: number;
}

function toAuthUser(
  user: Pick<UserModel, 'id' | 'username' | 'email' | 'companyId'>,
): AuthUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    companyId: user.companyId,
  };
}

async function argon2Hash(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

async function argon2Verify(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}

function matchesInstallationSecret(expected: string, supplied: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  return (
    expectedBuffer.length === suppliedBuffer.length &&
    timingSafeEqual(expectedBuffer, suppliedBuffer)
  );
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async setup(dto: SetupDto): Promise<AuthSession> {
    const existingInstallation = await this.prisma.installation.findUnique({
      where: { id: 'singleton' },
      select: { id: true },
    });
    if (existingInstallation) {
      throw new ForbiddenException('Setup already completed');
    }

    const installationSecret =
      this.configService.getOrThrow<string>('INSTALLATION_SECRET');
    if (!matchesInstallationSecret(installationSecret, dto.installationSecret)) {
      throw new ForbiddenException('Invalid installation secret');
    }

    const passwordHash = await argon2Hash(dto.password);

    try {
      const user = await this.prisma.$transaction(async (transaction) => {
        const company = await transaction.company.create({
          data: { name: dto.companyName.trim() },
          select: { id: true },
        });
        const owner = await transaction.user.create({
          data: {
            username: dto.username,
            email: dto.email,
            passwordHash,
            companyId: company.id,
          },
          select: { id: true, username: true, email: true, companyId: true },
        });
        await transaction.installation.create({
          data: {
            id: 'singleton',
            companyId: company.id,
            ownerId: owner.id,
          },
        });
        return owner;
      });

      return this.buildSession(user);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ForbiddenException('Setup already completed');
      }
      throw error;
    }
  }

  async getInstallationStatus(): Promise<{ installed: boolean }> {
    const installation = await this.prisma.installation.findUnique({
      where: { id: 'singleton' },
      select: { id: true },
    });
    return { installed: installation !== null };
  }

  async login(dto: LoginDto): Promise<AuthSession> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !(await argon2Verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildSession(user);
  }

  async getProfile(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true, companyId: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return toAuthUser(user);
  }

  private async buildSession(
    user: Pick<UserModel, 'id' | 'username' | 'email' | 'companyId'>,
  ): Promise<AuthSession> {
    const token = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      companyId: user.companyId,
    });

    const cookieMaxAge = durationToMs(
      this.configService.get<string>('JWT_EXPIRES_IN', '1h'),
    );

    return { user: toAuthUser(user), token, cookieMaxAge };
  }
}
