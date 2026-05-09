import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker, type Job } from 'bullmq';
import {
  ScrapeProcessor,
  type BaselineScrapePayload,
} from './scrape.processor';

const BASELINE_SCRAPE_QUEUE = 'baseline-scrape';

@Injectable()
export class ScrapeWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ScrapeWorker.name);
  private worker: Worker<BaselineScrapePayload> | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly processor: ScrapeProcessor,
  ) {}

  onModuleInit(): void {
    const url = this.config.get<string>('REDIS_URL');
    if (!url) {
      this.logger.error(
        'REDIS_URL not set — worker will not consume any jobs.',
      );
      return;
    }

    this.worker = new Worker<BaselineScrapePayload>(
      BASELINE_SCRAPE_QUEUE,
      async (job: Job<BaselineScrapePayload>) => {
        this.logger.log(`Job ${job.id}: ${JSON.stringify(job.data)}`);
        await this.processor.runBaseline(job.data);
      },
      {
        connection: { url, family: 0 },
        concurrency: 2,
      },
    );

    this.worker.on('completed', (job) =>
      this.logger.log(`Job ${job.id} completed`),
    );
    this.worker.on('failed', (job, err) =>
      this.logger.error(
        `Job ${job?.id ?? 'unknown'} failed: ${err.message}`,
        err.stack,
      ),
    );
    this.worker.on('ready', () =>
      this.logger.log(
        `BullMQ worker ready on queue "${BASELINE_SCRAPE_QUEUE}"`,
      ),
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }
}
