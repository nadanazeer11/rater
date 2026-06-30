import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

export const ATTRIBUTION_SYNC_QUEUE = 'attribution-sync';

export type AttributionSyncPayload = { locationId: string };

/** Producer for an on-demand attribution sync ("check Google now"). The daily
 *  sweep in the worker is the scheduled path; this is the manual kick. */
@Injectable()
export class AttributionQueue implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AttributionQueue.name);
  private queue: Queue<AttributionSyncPayload> | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const url = this.config.get<string>('REDIS_URL');
    if (!url) {
      this.logger.warn('REDIS_URL not set — AttributionQueue disabled.');
      return;
    }
    this.queue = new Queue<AttributionSyncPayload>(ATTRIBUTION_SYNC_QUEUE, {
      connection: { url, family: 0 },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 10_000 },
        removeOnComplete: { age: 86_400, count: 500 },
        removeOnFail: { age: 7 * 86_400 },
      },
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue?.close();
  }

  async enqueueSync(locationId: string): Promise<void> {
    await this.queue?.add('sync', { locationId }, { jobId: `attr-sync-${locationId}` });
  }
}
