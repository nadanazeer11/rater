import { Module } from '@nestjs/common';
import { PostmarkWebhookController } from './postmark.controller';
import { PostmarkWebhookService } from './postmark.service';

@Module({
  controllers: [PostmarkWebhookController],
  providers: [PostmarkWebhookService],
})
export class WebhooksModule {}
