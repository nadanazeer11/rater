import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

export const CAMPAIGN_SCHEDULER_QUEUE = 'campaign-scheduler';

export type EvaluateFollowupsPayload = {
  reviewRequestId: string;
};

/**
 * Producer that asks the worker to (re-)evaluate a request's follow-up steps —
 * e.g. right after the request is created or its rating changes. The worker's
 * evaluator is idempotent, so kicking it more than once is harmless; the
 * reconciliation sweep is the backstop if a kick is ever dropped.
 */
@Injectable()
export class SchedulerQueue implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SchedulerQueue.name);
  private queue: Queue<EvaluateFollowupsPayload> | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const url = this.config.get<string>('REDIS_URL');
    if (!url) {
      this.logger.warn(
        'REDIS_URL not set — SchedulerQueue is disabled. Follow-up evaluation will not be kicked (the worker sweep, if running, still covers it).',
      );
      return;
    }

    this.queue = new Queue<EvaluateFollowupsPayload>(CAMPAIGN_SCHEDULER_QUEUE, {
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

  async enqueueEvaluate(reviewRequestId: string): Promise<void> {
    if (!this.queue) return;
    await this.queue.add(
      'evaluate',
      { reviewRequestId },
      // Collapse rapid duplicate kicks for the same request into one job.
      { jobId: `evaluate-${reviewRequestId}` },
    );
  }
}
