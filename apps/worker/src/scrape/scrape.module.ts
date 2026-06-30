import { Module } from '@nestjs/common';
import { OutscraperService } from './outscraper.service';
import { ScrapeProcessor } from './scrape.processor';
import { ScrapeWorker } from './scrape.worker';

@Module({
  providers: [OutscraperService, ScrapeProcessor, ScrapeWorker],
  exports: [OutscraperService],
})
export class ScrapeModule {}
