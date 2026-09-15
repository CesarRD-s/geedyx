export interface PasswordResetEmail {
  template: 'PASSWORD_RESET';
  recipient: string;
  resetUrl: string;
  expiresAt: string;
}

export interface UserInvitationEmail {
  template: 'USER_INVITATION';
  recipient: string;
  invitationUrl: string;
  expiresAt: string;
}

export interface EmailChangeVerificationEmail {
  template: 'EMAIL_CHANGE_VERIFICATION';
  recipient: string;
  verificationUrl: string;
  expiresAt: string;
}

export type TransactionalEmail =
  | PasswordResetEmail
  | UserInvitationEmail
  | EmailChangeVerificationEmail;

export interface EmailProviderResult {
  delivered: boolean;
  suppressed?: boolean;
  providerMessageId?: string;
  errorCode?: string;
}

export interface TransactionalEmailProvider {
  readonly name: string;
  send(
    message: TransactionalEmail,
    idempotencyKey: string,
  ): Promise<EmailProviderResult>;
}
