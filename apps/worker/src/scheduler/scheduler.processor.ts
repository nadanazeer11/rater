import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@rater/db';
import { matchesRequiredState } from '@rater/types';
import { PrismaService } from '../prisma/prisma.service';
import { SchedulerProducer } from './scheduler.producer';

const DAY_MS = 86_400_000;
const SWEEP_LIMIT = 500;
const SWEEP_WINDOW_MS = 30 * DAY_MS;

type StepRow = {
  id: string;
  stepOrder: number;
  stepType: string;
  delayDays: number;
  delayAnchor: string;
  requiredState: Prisma.JsonValue;
};
type ExecRow = {
  campaignStepId: string;
  status: string;
  executedAt: Date | null;
  scheduledFor: Date;
};

@Injectable()
export class SchedulerProcessor {
  private readonly logger = new Logger(SchedulerProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly producer: SchedulerProducer,
  ) {}

  /** When a step becomes due, given its anchor. Returns null when the anchor
   *  time isn't known yet (e.g. rating_submitted before any rating) — the step
   *  waits and is revisited on the next trigger/sweep. */
  private computeDueAt(
    step: StepRow,
    createdAt: Date,
    ratingSubmittedAt: Date | null,
    steps: StepRow[],
    execByStep: Map<string, ExecRow>,
  ): Date | null {
    const delayMs = step.delayDays * DAY_MS;
    switch (step.delayAnchor) {
      case 'request_created':
        return new Date(createdAt.getTime() + delayMs);
      case 'rating_submitted':
        return ratingSubmittedAt
          ? new Date(ratingSubmittedAt.getTime() + delayMs)
          : null;
      case 'previous_step': {
        const idx = steps.findIndex((s) => s.id === step.id);
        const prev = idx > 0 ? steps[idx - 1] : undefined;
        if (!prev) return new Date(createdAt.getTime() + delayMs);
        const prevExec = execByStep.get(prev.id);
        const base = prevExec?.executedAt ?? prevExec?.scheduledFor ?? null;
        return base ? new Date(base.getTime() + delayMs) : null;
      }
      default:
        return null;
    }
  }

  async runEvaluate(reviewRequestId: string): Promise<void> {
    const request = await this.prisma.reviewRequest.findFirst({
      where: { id: reviewRequestId, deletedAt: null },
      select: {
        id: true,
        createdAt: true,
        deliveryStatus: true,
        engagementStatus: true,
        ratingStatus: true,
        googleAttributionStatus: true,
        customer: { select: { email: true, emailStatus: true } },
        ratingSubmission: { select: { submittedAt: true } },
        campaign: {
          select: {
            steps: {
              orderBy: { stepOrder: 'asc' },
              select: {
                id: true,
                stepOrder: true,
                stepType: true,
                delayDays: true,
                delayAnchor: true,
                requiredState: true,
              },
            },
          },
        },
        stepExecutions: {
          select: { campaignStepId: true, status: true, executedAt: true, scheduledFor: true },
        },
      },
    });
    if (!request) return;

    const steps = request.campaign.steps;
    const execByStep = new Map(request.stepExecutions.map((e) => [e.campaignStepId, e]));
    const ratingAt = request.ratingSubmission?.submittedAt ?? null;
    const now = Date.now();
    let earliestPending: number | null = null;

    for (const step of steps) {
      // The initial step is owned by the send-initial path, not the scheduler.
      if (step.stepType === 'initial') continue;
      if (execByStep.has(step.id)) continue; // already executed/skipped/failed/claimed

      const dueAt = this.computeDueAt(step, request.createdAt, ratingAt, steps, execByStep);
      if (dueAt === null) continue; // anchor not satisfiable yet — revisit later

      if (dueAt.getTime() > now) {
        earliestPending =
          earliestPending === null ? dueAt.getTime() : Math.min(earliestPending, dueAt.getTime());
        continue;
      }

      // Due now. Pre-check the predicate (the mailer re-checks authoritatively
      // at send time). Claim the step by creating its execution row — the unique
      // (reviewRequestId, campaignStepId) constraint makes this the lock that
      // prevents a concurrent run from double-enqueuing the send.
      const sendable =
        !!request.customer?.email &&
        request.customer.emailStatus === 'valid' &&
        matchesRequiredState(request, step.requiredState as Record<string, unknown> | null);

      try {
        await this.prisma.reviewRequestStepExecution.create({
          data: {
            reviewRequestId,
            campaignStepId: step.id,
            scheduledFor: dueAt,
            ...(sendable
              ? { status: 'scheduled' }
              : { status: 'skipped', executedAt: new Date() }),
          },
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          continue; // already claimed by another run — nothing to do
        }
        throw err;
      }

      if (sendable) {
        await this.producer.enqueueSendStep(reviewRequestId, step.id);
      } else {
        this.logger.log(`Skipped ${step.stepType} for ${reviewRequestId} (condition not met)`);
      }
    }

    if (earliestPending !== null) {
      await this.producer.enqueueEvaluateDelayed(reviewRequestId, earliestPending - now);
    }
  }

  /** Re-drives recent, non-deleted requests so a stalled follow-up chain heals.
   *  Bounded; logs when it hits the cap rather than silently truncating. */
  async runSweep(): Promise<void> {
    const since = new Date(Date.now() - SWEEP_WINDOW_MS);
    const candidates = await this.prisma.reviewRequest.findMany({
      where: { deletedAt: null, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: SWEEP_LIMIT,
      select: { id: true },
    });
    for (const c of candidates) {
      await this.producer.enqueueEvaluate(c.id);
    }
    this.logger.log(`Sweep enqueued ${candidates.length} evaluations`);
    if (candidates.length === SWEEP_LIMIT) {
      this.logger.warn(
        `Sweep hit cap ${SWEEP_LIMIT}; older requests not swept this run.`,
      );
    }
  }
}
