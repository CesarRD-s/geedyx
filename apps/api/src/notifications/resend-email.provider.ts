import type {
  EmailProviderResult,
  TransactionalEmail,
  TransactionalEmailProvider,
} from './email-provider.js';

interface ResendResponse {
  id?: unknown;
}

export class ResendEmailProvider implements TransactionalEmailProvider {
  readonly name = 'resend';

  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(
    message: TransactionalEmail,
    idempotencyKey: string,
  ): Promise<EmailProviderResult> {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          'content-type': 'application/json',
          'idempotency-key': idempotencyKey,
        },
        body: JSON.stringify({
          from: this.from,
          to: [message.recipient],
          ...this.content(message),
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        return { delivered: false, errorCode: `http_${response.status}` };
      }
      const body = (await response.json()) as ResendResponse;
      return {
        delivered: true,
        providerMessageId: typeof body.id === 'string' ? body.id : undefined,
      };
    } catch {
      return { delivered: false, errorCode: 'network_error' };
    }
  }

  private content(message: TransactionalEmail): {
    subject: string;
    text: string;
  } {
    if (message.template === 'PASSWORD_RESET') {
      return {
        subject: 'Restablece tu contraseña de GEEDYX',
        text: `Usa este enlace para restablecer tu contraseña: ${message.resetUrl}\n\nExpira: ${message.expiresAt}`,
      };
    }
    if (message.template === 'USER_INVITATION') {
      return {
        subject: 'Completa tu acceso a GEEDYX',
        text: `Usa este enlace para crear tu contraseña: ${message.invitationUrl}\n\nExpira: ${message.expiresAt}`,
      };
    }
    return {
      subject: 'Confirma tu nuevo correo de GEEDYX',
      text: `Usa este enlace para confirmar tu nuevo correo: ${message.verificationUrl}\n\nExpira: ${message.expiresAt}`,
    };
  }
}
