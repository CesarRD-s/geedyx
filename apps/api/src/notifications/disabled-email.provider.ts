import type {
  EmailProviderResult,
  TransactionalEmailProvider,
} from './email-provider.js';

export class DisabledEmailProvider implements TransactionalEmailProvider {
  readonly name = 'disabled';

  async send(): Promise<EmailProviderResult> {
    return { delivered: false, suppressed: true };
  }
}
