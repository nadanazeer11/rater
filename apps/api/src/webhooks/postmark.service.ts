import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface PostmarkWebhookBody {
  RecordType?: string;
  MessageID?: string;
  // Delivery
  // Bounce
  Type?: string;
  Description?: string;
  Details?: string;
  // SpamComplaint — RecordType = 'SpamComplaint'
  // Open
  [k: string]: unknown;
}

@Injectable()
export class PostmarkWebhookService {
  private readonly logger = new Logger(PostmarkWebhookService.name);

  constructor(private readonly prisma: PrismaService) {}

  async handle(body: PostmarkWebhookBody): Promise<{ ok: true; matched: boolean }> {
    const messageId = body.MessageID;
    if (!messageId) {
      this.logger.warn(
        `Postmark webhook missing MessageID: ${JSON.stringify(body).slice(0, 200)}`,
      );
      return { ok: true, matched: false };
    }

    const execution = await this.prisma.reviewRequestStepExecution.findUnique({
      where: { postmarkMessageId: messageId },
      include: {
        reviewRequest: { include: { customer: true } },
      },
    });

    if (!execution) {
      this.logger.warn(
        `Postmark webhook for unknown messageId=${messageId} type=${body.RecordType}`,
      );
      return { ok: true, matched: false };
    }

    const request = execution.reviewRequest;

    switch (body.RecordType) {
      case 'Delivery':
        await this.prisma.$transaction([
          this.prisma.reviewRequest.update({
            where: { id: request.id },
            data: { deliveryStatus: 'delivered' },
          }),
          this.prisma.event.create({
            data: {
              reviewRequestId: request.id,
              eventType: 'email_delivered',
              payload: { messageId },
            },
          }),
        ]);
        break;

      case 'Bounce': {
        const isHardBounce =
          typeof body.Type === 'string' && /HardBounce/i.test(body.Type);
        await this.prisma.$transaction([
          this.prisma.reviewRequest.update({
            where: { id: request.id },
            data: { deliveryStatus: 'bounced' },
          }),
          this.prisma.customer.update({
            where: { id: request.customer.id },
            data: { emailStatus: isHardBounce ? 'invalid' : request.customer.emailStatus },
          }),
          this.prisma.event.create({
            data: {
              reviewRequestId: request.id,
              eventType: 'email_bounced',
              payload: {
                messageId,
                bounceType: body.Type,
                description: body.Description,
              },
            },
          }),
        ]);
        break;
      }

      case 'SpamComplaint':
        await this.prisma.$transaction([
          this.prisma.reviewRequest.update({
            where: { id: request.id },
            data: { deliveryStatus: 'complained' },
          }),
          this.prisma.customer.update({
            where: { id: request.customer.id },
            data: { emailStatus: 'complained' },
          }),
          this.prisma.event.create({
            data: {
              reviewRequestId: request.id,
              eventType: 'email_complained',
              payload: { messageId },
            },
          }),
        ]);
        break;

      case 'Open':
        await this.prisma.$transaction([
          this.prisma.reviewRequest.update({
            where: { id: request.id },
            data: { engagementStatus: 'opened' },
          }),
          this.prisma.event.create({
            data: {
              reviewRequestId: request.id,
              eventType: 'email_opened',
              payload: { messageId },
            },
          }),
        ]);
        break;

      default:
        this.logger.warn(
          `Unhandled Postmark RecordType=${body.RecordType} for messageId=${messageId}`,
        );
    }

    return { ok: true, matched: true };
  }
}
