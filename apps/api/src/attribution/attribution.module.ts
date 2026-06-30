import { Module } from '@nestjs/common';
import { AttributionController } from './attribution.controller';
import { AttributionRepository } from './attribution.repository';
import { AttributionService } from './attribution.service';

@Module({
  controllers: [AttributionController],
  providers: [AttributionService, AttributionRepository],
})
export class AttributionModule {}
