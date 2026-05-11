import { Global, Module } from '@nestjs/common';
import { ScrapeQueue } from './scrape.queue';

@Global()
@Module({
  providers: [ScrapeQueue],
  exports: [ScrapeQueue],
})
export class QueueModule {}
