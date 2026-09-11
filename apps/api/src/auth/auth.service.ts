import argon2 from 'argon2';
import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { UserModel } from '../generated/prisma/models.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { durationToMs } from './duration.js';
import { LoginDto } from './dto/login.dto.js';
import { SetupDto } from './dto/setup.dto.js';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
}

export interface AuthSession {
  user: AuthUser;
  token: string;
  cookieMaxAge: number;
}

function toAuthUser(user: Pick<UserModel, 'id' | 'username' | 'email'>): AuthUser {
  return { id: user.id, username: user.username, email: user.email };
}

async function argon2Hash(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

async function argon2Verify(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async setup(dto: SetupDto): Promise<AuthSession> {
    const hasUsers = await this.prisma.user.findFirst();
    if (hasUsers) {
      throw new ForbiddenException('Setup already completed');
    }

    const passwordHash = await argon2Hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        passwordHash,
      },
      select: { id: true, username: true, email: true },
    });

    return this.buildSession(user);
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
      select: { id: true, username: true, email: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return toAuthUser(user);
  }

  private async buildSession(
    user: Pick<UserModel, 'id' | 'username' | 'email'>,
  ): Promise<AuthSession> {
    const token = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    });

    const cookieMaxAge = durationToMs(
      this.configService.get<string>('JWT_EXPIRES_IN', '1h'),
    );

    return { user: toAuthUser(user), token, cookieMaxAge };
  }
}