import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PostmarkWebhookBody,
  PostmarkWebhookService,
} from './postmark.service';

@Controller('webhooks/postmark')
export class PostmarkWebhookController {
  private readonly logger = new Logger(PostmarkWebhookController.name);

  constructor(
    private readonly service: PostmarkWebhookService,
    private readonly config: ConfigService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handle(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: PostmarkWebhookBody,
  ): Promise<{ ok: true; matched: boolean }> {
    this.assertBasicAuth(authorization);
    return this.service.handle(body);
  }

  private assertBasicAuth(authorization: string | undefined): void {
    const user = (this.config.get<string>('POSTMARK_WEBHOOK_USERNAME') ?? '').trim();
    const pass = (this.config.get<string>('POSTMARK_WEBHOOK_PASSWORD') ?? '').trim();
    if (!user || !pass) {
      this.logger.error(
        'POSTMARK_WEBHOOK_USERNAME / POSTMARK_WEBHOOK_PASSWORD not set — refusing webhook.',
      );
      throw new UnauthorizedException();
    }
    if (!authorization || !authorization.startsWith('Basic ')) {
      throw new UnauthorizedException();
    }
    const decoded = Buffer.from(authorization.slice(6), 'base64').toString('utf8');
    const expected = `${user}:${pass}`;
    if (decoded !== expected) {
      throw new UnauthorizedException();
    }
  }
}
