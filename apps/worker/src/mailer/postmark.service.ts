import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServerClient } from 'postmark';
import { randomBytes } from 'node:crypto';

export interface SendEmailInput {
  to: string;
  from: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  messageStream?: string;
}

export interface SendEmailResult {
  messageId: string;
  stubbed: boolean;
}

const STUB_TOKEN_VALUES = ['', 'stub', 'placeholder', 'todo'];

@Injectable()
export class PostmarkService {
  private readonly logger = new Logger(PostmarkService.name);
  private readonly client: ServerClient | null;
  private readonly stubbed: boolean;

  constructor(private readonly config: ConfigService) {
    const token = (config.get<string>('POSTMARK_SERVER_TOKEN') ?? '').trim();
    this.stubbed = STUB_TOKEN_VALUES.includes(token.toLowerCase());
    this.client = this.stubbed ? null : new ServerClient(token);
    if (this.stubbed) {
      this.logger.warn(
        'POSTMARK_SERVER_TOKEN is unset/stub — emails will be logged, not sent.',
      );
    }
  }

  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    if (this.stubbed || !this.client) {
      const messageId = `stub-${randomBytes(12).toString('hex')}`;
      this.logger.log(
        `[STUB] would send to=${input.to} subject="${input.subject}" messageId=${messageId}`,
      );
      return { messageId, stubbed: true };
    }

    const res = await this.client.sendEmail({
      From: input.from,
      To: input.to,
      Subject: input.subject,
      HtmlBody: input.htmlBody,
      TextBody: input.textBody,
      MessageStream: input.messageStream ?? 'outbound',
      TrackOpens: true,
    });
    return { messageId: res.MessageID, stubbed: false };
  }
}
