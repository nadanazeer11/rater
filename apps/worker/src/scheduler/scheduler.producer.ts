import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

export const CAMPAIGN_SCHEDULER_QUEUE = 'campaign-scheduler';
export const SEND_REVIEW_REQUEST_EMAIL_QUEUE = 'send-review-request-email';

const SWEEP_EVERY_MS = 15 * 60_000;

/**
 * Worker-side producer for the scheduler. Owns the campaign-scheduler queue
 * (evaluate + the repeatable reconciliation sweep) and enqueues step sends onto
 * the mailer queue. No-ops cleanly when REDIS_URL is unset (e.g. CI), so the
 * worker still boots without Redis.
 */
@Injectable()
export class SchedulerProducer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SchedulerProducer.name);
  private schedulerQueue: Queue | null = null;
  private mailerQueue: Queue | null = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = this.config.get<string>('REDIS_URL');
    if (!url) {
      this.logger.warn('REDIS_URL not set — SchedulerProducer disabled.');
      return;
    }
    const connection = { url, family: 0 };
    const defaultJobOptions = {
      attempts: 3,
      backoff: { type: 'exponential' as const, delay: 5_000 },
      removeOnComplete: { age: 86_400, count: 1_000 },
      removeOnFail: { age: 7 * 86_400 },
    };
    this.schedulerQueue = new Queue(CAMPAIGN_SCHEDULER_QUEUE, {
      connection,
      defaultJobOptions,
    });
    this.mailerQueue = new Queue(SEND_REVIEW_REQUEST_EMAIL_QUEUE, {
      connection,
      defaultJobOptions,
    });

    // Reconciliation sweep — the backstop that re-drives any request whose
    // chain stalled (dropped job, worker restart). Idempotent on the evaluator.
    await this.schedulerQueue.add(
      'sweep',
      {},
      { repeat: { every: SWEEP_EVERY_MS }, jobId: 'reconciliation-sweep' },
    );
    this.logger.log(`Reconciliation sweep scheduled every ${SWEEP_EVERY_MS / 60_000}m`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.schedulerQueue?.close();
    await this.mailerQueue?.close();
  }

  async enqueueEvaluate(reviewRequestId: string): Promise<void> {
    await this.schedulerQueue?.add(
      'evaluate',
      { reviewRequestId },
      { jobId: `evaluate-${reviewRequestId}` },
    );
  }

  async enqueueEvaluateDelayed(reviewRequestId: string, delayMs: number): Promise<void> {
    await this.schedulerQueue?.add(
      'evaluate',
      { reviewRequestId },
      { delay: Math.max(0, delayMs), jobId: `evaluate-due-${reviewRequestId}` },
    );
  }

  async enqueueSendStep(reviewRequestId: string, campaignStepId: string): Promise<void> {
    await this.mailerQueue?.add(
      'send-step',
      { reviewRequestId, campaignStepId },
      { jobId: `step-${reviewRequestId}-${campaignStepId}` },
    );
  }
}
