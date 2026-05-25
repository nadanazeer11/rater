import { Global, Module } from '@nestjs/common';
import { MailerQueue } from './mailer.queue';
import { ScrapeQueue } from './scrape.queue';

@Global()
@Module({
  providers: [ScrapeQueue, MailerQueue],
  exports: [ScrapeQueue, MailerQueue],
})
export class QueueModule {}
