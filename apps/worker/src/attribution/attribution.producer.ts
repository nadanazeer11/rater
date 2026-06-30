import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

export const ATTRIBUTION_SYNC_QUEUE = 'attribution-sync';

const SWEEP_EVERY_MS = 24 * 60 * 60_000;

/** Owns the attribution-sync queue (per-location sync + the daily sweep).
 *  No-ops without Redis so the worker still boots. */
@Injectable()
export class AttributionProducer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AttributionProducer.name);
  private queue: Queue | null = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = this.config.get<string>('REDIS_URL');
    if (!url) {
      this.logger.warn('REDIS_URL not set — AttributionProducer disabled.');
      return;
    }
    this.queue = new Queue(ATTRIBUTION_SYNC_QUEUE, {
      connection: { url, family: 0 },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 10_000 },
        removeOnComplete: { age: 86_400, count: 500 },
        removeOnFail: { age: 7 * 86_400 },
      },
    });
    await this.queue.add('sweep', {}, { repeat: { every: SWEEP_EVERY_MS }, jobId: 'attribution-sweep' });
    this.logger.log('Attribution sweep scheduled daily');
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue?.close();
  }

  async enqueueSync(locationId: string): Promise<void> {
    await this.queue?.add('sync', { locationId }, { jobId: `attr-sync-${locationId}` });
  }
}
