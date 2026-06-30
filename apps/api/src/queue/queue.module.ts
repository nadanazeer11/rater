import { Global, Module } from '@nestjs/common';
import { MailerQueue } from './mailer.queue';
import { SchedulerQueue } from './scheduler.queue';
import { ScrapeQueue } from './scrape.queue';

@Global()
@Module({
  providers: [ScrapeQueue, MailerQueue, SchedulerQueue],
  exports: [ScrapeQueue, MailerQueue, SchedulerQueue],
})
export class QueueModule {}
