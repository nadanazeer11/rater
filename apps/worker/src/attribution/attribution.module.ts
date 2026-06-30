import { Module } from '@nestjs/common';
import { ScrapeModule } from '../scrape/scrape.module';
import { AttributionMatcher } from './attribution.matcher';
import { AttributionProcessor } from './attribution.processor';
import { AttributionProducer } from './attribution.producer';
import { AttributionWorker } from './attribution.worker';

@Module({
  imports: [ScrapeModule],
  providers: [
    AttributionMatcher,
    AttributionProducer,
    AttributionProcessor,
    AttributionWorker,
  ],
})
export class AttributionModule {}
