import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { DisabledEmailProvider } from './disabled-email.provider.js';
import type {
  EmailProviderResult,
  EmailChangeVerificationEmail,
  PasswordResetEmail,
  TransactionalEmailProvider,
  UserInvitationEmail,
} from './email-provider.js';
import { ResendEmailProvider } from './resend-email.provider.js';

export interface PasswordResetDeliveryInput {
  companyId: string;
  recipient: string;
  resetUrl: string;
  expiresAt: string;
}

export interface UserInvitationDeliveryInput {
  companyId: string;
  recipient: string;
  invitationUrl: string;
  expiresAt: string;
}

export interface EmailChangeVerificationDeliveryInput {
  companyId: string;
  recipient: string;
  verificationUrl: string;
  expiresAt: string;
}

@Injectable()
export class EmailDeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async deliverPasswordReset(
    input: PasswordResetDeliveryInput,
  ): Promise<boolean> {
    return this.deliver({
      companyId: input.companyId,
      recipient: input.recipient,
      message: {
        template: 'PASSWORD_RESET',
        recipient: input.recipient,
        resetUrl: input.resetUrl,
        expiresAt: input.expiresAt,
      },
    });
  }

  async deliverInvitation(
    input: UserInvitationDeliveryInput,
  ): Promise<boolean> {
    return this.deliver({
      companyId: input.companyId,
      recipient: input.recipient,
      message: {
        template: 'USER_INVITATION',
        recipient: input.recipient,
        invitationUrl: input.invitationUrl,
        expiresAt: input.expiresAt,
      },
    });
  }

  async deliverEmailChangeVerification(
    input: EmailChangeVerificationDeliveryInput,
  ): Promise<boolean> {
    return this.deliver({
      companyId: input.companyId,
      recipient: input.recipient,
      message: {
        template: 'EMAIL_CHANGE_VERIFICATION',
        recipient: input.recipient,
        verificationUrl: input.verificationUrl,
        expiresAt: input.expiresAt,
      },
    });
  }

  private async deliver(input: {
    companyId: string;
    recipient: string;
    message:
      | PasswordResetEmail
      | UserInvitationEmail
      | EmailChangeVerificationEmail;
  }): Promise<boolean> {
    const provider = this.provider();
    const delivery = await this.prisma.emailDelivery.create({
      data: {
        companyId: input.companyId,
        template: input.message.template,
        recipientHash: this.hashRecipient(input.recipient),
        provider: provider.name,
      },
      select: { id: true },
    });
    let attemptCount = 1;
    let result = await this.send(provider, input.message, delivery.id);
    if (result.suppressed) {
      await this.prisma.emailDelivery.update({
        where: { id: delivery.id },
        data: { status: 'SUPPRESSED', completedAt: new Date() },
      });
      return false;
    }

    const maximumAttempts = this.config.get<number>(
      'EMAIL_DELIVERY_MAX_ATTEMPTS',
      2,
    );
    while (!result.delivered && attemptCount < maximumAttempts) {
      attemptCount += 1;
      result = await this.send(provider, input.message, delivery.id);
    }
    const now = new Date();
    await this.prisma.emailDelivery.update({
      where: { id: delivery.id },
      data: result.delivered
        ? {
            status: 'DELIVERED',
            attempts: attemptCount,
            providerMessageId: result.providerMessageId,
            lastErrorCode: null,
            deliveredAt: now,
            completedAt: now,
          }
        : {
            status: 'FAILED',
            attempts: attemptCount,
            lastErrorCode: result.errorCode ?? 'provider_rejected',
            completedAt: now,
          },
    });
    return result.delivered;
  }

  private async send(
    provider: TransactionalEmailProvider,
    message:
      | PasswordResetEmail
      | UserInvitationEmail
      | EmailChangeVerificationEmail,
    deliveryId: string,
  ): Promise<EmailProviderResult> {
    return provider.send(message, `geedyx-email-${deliveryId}`);
  }

  private provider(): TransactionalEmailProvider {
    if (this.config.get<string>('EMAIL_PROVIDER', 'disabled') === 'resend') {
      return new ResendEmailProvider(
        this.config.getOrThrow<string>('RESEND_API_KEY'),
        this.config.getOrThrow<string>('EMAIL_FROM'),
      );
    }
    return new DisabledEmailProvider();
  }

  private hashRecipient(recipient: string): string {
    return createHash('sha256')
      .update(recipient.trim().toLowerCase())
      .digest('hex');
  }
}
