import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker, type Job } from 'bullmq';
import {
  MailerProcessor,
  type SendReviewRequestEmailPayload,
  type SendStepEmailPayload,
} from './mailer.processor';

export const SEND_REVIEW_REQUEST_EMAIL_QUEUE = 'send-review-request-email';

type MailerJobPayload = SendReviewRequestEmailPayload | SendStepEmailPayload;

function hasStepId(p: MailerJobPayload): p is SendStepEmailPayload {
  return 'campaignStepId' in p && typeof p.campaignStepId === 'string';
}

@Injectable()
export class MailerWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MailerWorker.name);
  private worker: Worker<MailerJobPayload> | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly processor: MailerProcessor,
  ) {}

  onModuleInit(): void {
    const url = this.config.get<string>('REDIS_URL');
    if (!url) {
      this.logger.error(
        'REDIS_URL not set — mailer worker will not consume any jobs.',
      );
      return;
    }

    this.worker = new Worker<MailerJobPayload>(
      SEND_REVIEW_REQUEST_EMAIL_QUEUE,
      async (job: Job<MailerJobPayload>) => {
        this.logger.log(`Job ${job.id}: ${JSON.stringify(job.data)}`);
        // A `send-step` job (from the scheduler) names a specific campaign step;
        // a `send-initial` job (from the api) resolves the initial step itself.
        if (hasStepId(job.data)) {
          await this.processor.runSendStepEmail(job.data);
        } else {
          await this.processor.runSendInitialEmail(job.data);
        }
      },
      {
        connection: { url, family: 0 },
        concurrency: 4,
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
        `BullMQ worker ready on queue "${SEND_REVIEW_REQUEST_EMAIL_QUEUE}"`,
      ),
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }
}
