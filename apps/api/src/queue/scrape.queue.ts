import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

export const BASELINE_SCRAPE_QUEUE = 'baseline-scrape';

export type BaselineScrapePayload = {
  locationId: string;
};

@Injectable()
export class ScrapeQueue implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ScrapeQueue.name);
  private queue: Queue<BaselineScrapePayload> | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const url = this.config.get<string>('REDIS_URL');
    if (!url) {
      this.logger.warn(
        'REDIS_URL not set — ScrapeQueue is disabled. Jobs will be silently dropped.',
      );
      return;
    }

    this.queue = new Queue<BaselineScrapePayload>(BASELINE_SCRAPE_QUEUE, {
      connection: { url, family: 0 },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: { age: 86_400, count: 1_000 },
        removeOnFail: { age: 7 * 86_400 },
      },
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue?.close();
  }

  async enqueueBaseline(locationId: string): Promise<void> {
    if (!this.queue) {
      this.logger.warn(
        `ScrapeQueue disabled — skipped baseline-scrape for ${locationId}`,
      );
      return;
    }

    await this.queue.add(
      'baseline',
      { locationId },
      { jobId: `baseline-${locationId}` },
    );
    this.logger.log(`Enqueued baseline-scrape for ${locationId}`);
  }
}
