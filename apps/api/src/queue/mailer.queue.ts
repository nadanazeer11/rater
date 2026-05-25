import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

export const SEND_REVIEW_REQUEST_EMAIL_QUEUE = 'send-review-request-email';

export type SendReviewRequestEmailPayload = {
  reviewRequestId: string;
};

@Injectable()
export class MailerQueue implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MailerQueue.name);
  private queue: Queue<SendReviewRequestEmailPayload> | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const url = this.config.get<string>('REDIS_URL');
    if (!url) {
      this.logger.warn(
        'REDIS_URL not set — MailerQueue is disabled. Jobs will be silently dropped.',
      );
      return;
    }

    this.queue = new Queue<SendReviewRequestEmailPayload>(
      SEND_REVIEW_REQUEST_EMAIL_QUEUE,
      {
        connection: { url, family: 0 },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5_000 },
          removeOnComplete: { age: 86_400, count: 1_000 },
          removeOnFail: { age: 7 * 86_400 },
        },
      },
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue?.close();
  }

  async enqueueReviewRequestEmail(reviewRequestId: string): Promise<void> {
    if (!this.queue) {
      this.logger.warn(
        `MailerQueue disabled — skipped send-review-request-email for ${reviewRequestId}`,
      );
      return;
    }

    await this.queue.add(
      'send-initial',
      { reviewRequestId },
      { jobId: `initial-${reviewRequestId}` },
    );
    this.logger.log(`Enqueued send-review-request-email for ${reviewRequestId}`);
  }
}
