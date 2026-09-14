import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PasswordResetMessage {
  recipient: string;
  resetUrl: string;
  expiresAt: string;
}

@Injectable()
export class PasswordResetDeliveryService {
  private readonly logger = new Logger(PasswordResetDeliveryService.name);

  constructor(private readonly config: ConfigService) {}

  async deliver(message: PasswordResetMessage): Promise<boolean> {
    const endpoint = this.config.get<string>(
      'PASSWORD_RESET_DELIVERY_ENDPOINT',
    );
    const token = this.config.get<string>('PASSWORD_RESET_DELIVERY_TOKEN');
    if (!endpoint || !token) {
      return false;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(message),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        this.logger.error(
          'Password reset delivery provider rejected a request',
        );
        return false;
      }
      return true;
    } catch {
      this.logger.error('Password reset delivery provider was unavailable');
      return false;
    }
  }
}
