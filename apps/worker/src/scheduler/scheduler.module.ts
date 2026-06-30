import { Module } from '@nestjs/common';
import { SchedulerProcessor } from './scheduler.processor';
import { SchedulerProducer } from './scheduler.producer';
import { SchedulerWorker } from './scheduler.worker';

@Module({
  providers: [SchedulerProducer, SchedulerProcessor, SchedulerWorker],
})
export class SchedulerModule {}
