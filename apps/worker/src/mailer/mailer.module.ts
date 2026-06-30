import { Module } from '@nestjs/common';
import { MailerProcessor } from './mailer.processor';
import { MailerWorker } from './mailer.worker';
import { PostmarkService } from './postmark.service';

@Module({
  providers: [PostmarkService, MailerProcessor, MailerWorker],
})
export class MailerModule {}
