import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { renderTemplate } from '@rater/types';
import { PrismaService } from '../prisma/prisma.service';
import { PostmarkService } from './postmark.service';

export type SendReviewRequestEmailPayload = {
  reviewRequestId: string;
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

  async runSendInitialEmail({
    reviewRequestId,
  }: SendReviewRequestEmailPayload): Promise<void> {
    const request = await this.prisma.reviewRequest.findFirst({
      where: { id: reviewRequestId, deletedAt: null },
      include: {
        customer: true,
        location: { include: { business: true } },
        campaign: {
          include: {
            steps: { where: { stepType: 'initial' }, orderBy: { stepOrder: 'asc' } },
          },
        },
      },
    });

    if (!request) {
      this.logger.warn(`Skip send: review request ${reviewRequestId} not found`);
      return;
    }
    if (!request.customer || !request.customer.email) {
      this.logger.warn(`Skip send: request ${reviewRequestId} has no customer email`);
      return;
    }
    if (request.customer.emailStatus !== 'valid') {
      this.logger.warn(
        `Skip send: customer ${request.customer.id} emailStatus=${request.customer.emailStatus}`,
      );
      return;
    }
    const step = request.campaign?.steps?.[0];
    if (!step) {
      this.logger.warn(
        `Skip send: request ${reviewRequestId} campaign has no initial step`,
      );
      return;
    }

    const execution = await this.prisma.reviewRequestStepExecution.upsert({
      where: {
        reviewRequestId_campaignStepId: {
          reviewRequestId: request.id,
          campaignStepId: step.id,
        },
      },
      create: {
        reviewRequestId: request.id,
        campaignStepId: step.id,
        scheduledFor: new Date(),
        status: 'scheduled',
      },
      update: {},
    });

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

    const from = (this.config.get<string>('POSTMARK_FROM_EMAIL') ?? DEFAULT_FROM).trim();
    const messageStream =
      this.config.get<string>('POSTMARK_MESSAGE_STREAM') ?? 'outbound';

    try {
      const result = await this.postmark.sendEmail({
        to: request.customer.email,
        from,
        subject,
        htmlBody,
        textBody,
        messageStream,
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
              stubbed: result.stubbed,
            },
          },
        }),
      ]);

      this.logger.log(
        `Sent initial email for request ${request.id} -> ${request.customer.email} (messageId=${result.messageId}${result.stubbed ? ' STUB' : ''})`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.prisma.$transaction([
        this.prisma.reviewRequestStepExecution.update({
          where: { id: execution.id },
          data: {
            status: 'failed',
            executedAt: new Date(),
            errorMessage: message,
          },
        }),
        this.prisma.event.create({
          data: {
            reviewRequestId: request.id,
            eventType: 'email_send_failed',
            payload: {
              stepExecutionId: execution.id,
              errorMessage: message,
            },
          },
        }),
      ]);
      throw err;
    }
  }
}
