import { Global, Module } from '@nestjs/common';
import { AttributionQueue } from './attribution.queue';
import { MailerQueue } from './mailer.queue';
import { SchedulerQueue } from './scheduler.queue';
import { ScrapeQueue } from './scrape.queue';

@Global()
@Module({
  providers: [ScrapeQueue, MailerQueue, SchedulerQueue, AttributionQueue],
  exports: [ScrapeQueue, MailerQueue, SchedulerQueue, AttributionQueue],
})
export class QueueModule {}
