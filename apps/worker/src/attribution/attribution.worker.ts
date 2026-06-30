import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker, type Job } from 'bullmq';
import { AttributionProcessor } from './attribution.processor';
import { ATTRIBUTION_SYNC_QUEUE } from './attribution.producer';

type SyncPayload = { locationId: string };

@Injectable()
export class AttributionWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AttributionWorker.name);
  private worker: Worker<SyncPayload> | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly processor: AttributionProcessor,
  ) {}

  onModuleInit(): void {
    const url = this.config.get<string>('REDIS_URL');
    if (!url) {
      this.logger.error('REDIS_URL not set — attribution worker will not consume jobs.');
      return;
    }

    this.worker = new Worker<SyncPayload>(
      ATTRIBUTION_SYNC_QUEUE,
      async (job: Job<SyncPayload>) => {
        if (job.name === 'sweep') {
          await this.processor.runSweep();
          return;
        }
        await this.processor.runIncrementalSync(job.data.locationId);
      },
      { connection: { url, family: 0 }, concurrency: 2 },
    );

    this.worker.on('failed', (job, err) =>
      this.logger.error(`Job ${job?.id ?? 'unknown'} failed: ${err.message}`, err.stack),
    );
    this.worker.on('ready', () =>
      this.logger.log(`BullMQ worker ready on queue "${ATTRIBUTION_SYNC_QUEUE}"`),
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }
}
