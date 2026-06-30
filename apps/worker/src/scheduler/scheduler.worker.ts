import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker, type Job } from 'bullmq';
import { SchedulerProcessor } from './scheduler.processor';
import { CAMPAIGN_SCHEDULER_QUEUE } from './scheduler.producer';

type EvaluatePayload = { reviewRequestId: string };

@Injectable()
export class SchedulerWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SchedulerWorker.name);
  private worker: Worker<EvaluatePayload> | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly processor: SchedulerProcessor,
  ) {}

  onModuleInit(): void {
    const url = this.config.get<string>('REDIS_URL');
    if (!url) {
      this.logger.error(
        'REDIS_URL not set — scheduler worker will not consume any jobs.',
      );
      return;
    }

    this.worker = new Worker<EvaluatePayload>(
      CAMPAIGN_SCHEDULER_QUEUE,
      async (job: Job<EvaluatePayload>) => {
        if (job.name === 'sweep') {
          await this.processor.runSweep();
          return;
        }
        await this.processor.runEvaluate(job.data.reviewRequestId);
      },
      { connection: { url, family: 0 }, concurrency: 4 },
    );

    this.worker.on('failed', (job, err) =>
      this.logger.error(
        `Job ${job?.id ?? 'unknown'} failed: ${err.message}`,
        err.stack,
      ),
    );
    this.worker.on('ready', () =>
      this.logger.log(`BullMQ worker ready on queue "${CAMPAIGN_SCHEDULER_QUEUE}"`),
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }
}
