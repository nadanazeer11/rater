import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { matchesRequiredState, renderTemplate } from '@rater/types';
import { PrismaService } from '../prisma/prisma.service';
import { PostmarkService } from './postmark.service';
import { resolveSender } from './sender.resolver';

export type SendReviewRequestEmailPayload = {
  reviewRequestId: string;
};

export type SendStepEmailPayload = {
  reviewRequestId: string;
  campaignStepId: string;
};

const DEFAULT_FROM = 'noreply@example.com';
const DEFAULT_APP_URL = 'http://localhost:3001';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function toHtmlBody(text: string): string {
  const linked = escapeHtml(text).replace(
    /https?:\/\/[^\s<]+/g,
    (url) =>
      `<a href="${url}" style="color:#4F46E5;text-decoration:underline;">${url}</a>`,
  );
  const body = linked.replace(/\n/g, '<br>');
  return `<!doctype html><html><body style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;line-height:1.55;color:#18181B;font-size:15px;max-width:560px;margin:0 auto;padding:24px;">${body}</body></html>`;
}

@Injectable()
export class MailerProcessor {
  private readonly logger = new Logger(MailerProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly postmark: PostmarkService,
  ) {}

  /** Resolves the campaign's initial step, then delegates to the general
   *  step-send path. Used by the api's on-creation enqueue. */
  async runSendInitialEmail({
    reviewRequestId,
  }: SendReviewRequestEmailPayload): Promise<void> {
    const request = await this.prisma.reviewRequest.findFirst({
      where: { id: reviewRequestId, deletedAt: null },
      select: {
        campaign: {
          select: {
            steps: {
              where: { stepType: 'initial' },
              orderBy: { stepOrder: 'asc' },
              take: 1,
              select: { id: true },
            },
          },
        },
      },
    });
    const stepId = request?.campaign?.steps?.[0]?.id;
    if (!stepId) {
      this.logger.warn(
        `Skip send: request ${reviewRequestId} has no campaign initial step`,
      );
      return;
    }
    await this.runSendStepEmail({ reviewRequestId, campaignStepId: stepId });
  }

  /**
   * Sends one specific campaign step for a request. This is the AUTHORITATIVE
   * gate: it re-reads fresh status and re-checks the step's requiredState right
   * before sending, so a follow-up whose condition no longer holds (e.g. the
   * customer rated after the job was queued) is recorded as `skipped` and never
   * sent. Idempotent: an already-`executed` step short-circuits.
   */
  async runSendStepEmail({
    reviewRequestId,
    campaignStepId,
  }: SendStepEmailPayload): Promise<void> {
    const request = await this.prisma.reviewRequest.findFirst({
      where: { id: reviewRequestId, deletedAt: null },
      include: { customer: true, location: { include: { business: true } } },
    });
    if (!request) {
      this.logger.warn(`Skip send: review request ${reviewRequestId} not found`);
      return;
    }
    const step = await this.prisma.campaignStep.findUnique({
      where: { id: campaignStepId },
    });
    if (!step) {
      this.logger.warn(`Skip send: campaign step ${campaignStepId} not found`);
      return;
    }

    const execution = await this.prisma.reviewRequestStepExecution.upsert({
      where: {
        reviewRequestId_campaignStepId: { reviewRequestId, campaignStepId },
      },
      create: {
        reviewRequestId,
        campaignStepId,
        scheduledFor: new Date(),
        status: 'scheduled',
      },
      update: {},
    });
    if (execution.status === 'executed') {
      this.logger.log(`Step ${campaignStepId} already executed — skipping duplicate`);
      return;
    }

    // Authoritative deliverability + predicate re-check against fresh status.
    const isInitial = step.stepType === 'initial';
    const blockedReason = !request.customer?.email
      ? 'no customer email'
      : request.customer.emailStatus !== 'valid'
        ? `emailStatus=${request.customer.emailStatus}`
        : !isInitial &&
            !matchesRequiredState(
              request,
              step.requiredState as Record<string, unknown> | null,
            )
          ? 'condition no longer met'
          : null;

    if (blockedReason) {
      await this.prisma.reviewRequestStepExecution.update({
        where: { id: execution.id },
        data: { status: 'skipped', executedAt: new Date(), errorMessage: blockedReason },
      });
      this.logger.log(
        `Skipped step ${step.stepType} for request ${reviewRequestId}: ${blockedReason}`,
      );
      return;
    }

    const appUrl = (
      this.config.get<string>('NEXT_PUBLIC_APP_URL') ?? DEFAULT_APP_URL
    )
      .split(',')[0]
      ?.trim() ?? DEFAULT_APP_URL;
    const rateLink = `${appUrl}/rate/${request.publicToken}`;
    const vars: Record<string, string> = {
      name: request.customer.name ?? '',
      location: request.location.name,
      business: request.location.business.name,
      rate_link: rateLink,
    };

    const subject = renderTemplate(step.subjectTemplate, vars);
    const textBody = renderTemplate(step.bodyTemplate, vars);
    const htmlBody = toHtmlBody(textBody);

    const sharedFromEmail = (
      this.config.get<string>('POSTMARK_FROM_EMAIL') ?? DEFAULT_FROM
    ).trim();
    const sender = resolveSender({
      provider: request.location.senderProvider,
      businessName: request.location.business.name,
      fromEmailDomain: request.location.fromEmailDomain,
      fromEmailDomainVerified: request.location.fromEmailDomainVerified,
      replyToEmail: request.location.replyToEmail,
      messageStream: request.location.postmarkMessageStream,
      sharedFromEmail,
    });

    try {
      const result = await this.postmark.sendEmail({
        to: request.customer.email,
        from: sender.from,
        replyTo: sender.replyTo,
        subject,
        htmlBody,
        textBody,
        messageStream: sender.messageStream,
      });

      await this.prisma.$transaction([
        this.prisma.reviewRequestStepExecution.update({
          where: { id: execution.id },
          data: {
            status: 'executed',
            executedAt: new Date(),
            postmarkMessageId: result.messageId,
          },
        }),
        this.prisma.reviewRequest.update({
          where: { id: request.id },
          data: { deliveryStatus: 'sent' },
        }),
        this.prisma.event.create({
          data: {
            reviewRequestId: request.id,
            eventType: 'email_sent',
            payload: {
              postmarkMessageId: result.messageId,
              stepExecutionId: execution.id,
              stepType: step.stepType,
              stubbed: result.stubbed,
            },
          },
        }),
      ]);

      this.logger.log(
        `Sent ${step.stepType} for request ${request.id} -> ${request.customer.email} (messageId=${result.messageId}${result.stubbed ? ' STUB' : ''})`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.prisma.$transaction([
        this.prisma.reviewRequestStepExecution.update({
          where: { id: execution.id },
          data: { status: 'failed', executedAt: new Date(), errorMessage: message },
        }),
        this.prisma.event.create({
          data: {
            reviewRequestId: request.id,
            eventType: 'email_send_failed',
            payload: { stepExecutionId: execution.id, stepType: step.stepType, errorMessage: message },
          },
        }),
      ]);
      throw err;
    }
  }
}
