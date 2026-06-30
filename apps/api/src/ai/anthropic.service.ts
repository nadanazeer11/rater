import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

const STUB_VALUES = ['', 'stub', 'placeholder', 'todo'];
const REPLY_MODEL = 'claude-haiku-4-5-20251001';

export interface DraftReplyInput {
  businessName: string;
  locationName: string;
  reviewerName: string;
  rating: number;
  reviewText: string | null;
}

@Injectable()
export class AnthropicService {
  private readonly logger = new Logger(AnthropicService.name);
  private readonly client: Anthropic | null;
  readonly stubbed: boolean;

  constructor(config: ConfigService) {
    const key = (config.get<string>('ANTHROPIC_API_KEY') ?? '').trim();
    this.stubbed = STUB_VALUES.includes(key.toLowerCase());
    this.client = this.stubbed ? null : new Anthropic({ apiKey: key });
    if (this.stubbed) {
      this.logger.warn('ANTHROPIC_API_KEY unset/stub — AI replies use a template fallback.');
    }
  }

  /** Drafts a short, on-brand public reply to a Google review. Falls back to a
   *  rating-aware template when no API key is configured. */
  async draftReply(input: DraftReplyInput): Promise<string> {
    if (this.stubbed || !this.client) return this.templateReply(input);

    const positive = input.rating >= 4;
    const system =
      `You write short, warm, professional public replies to Google reviews on behalf of "${input.businessName}" ` +
      `(${input.locationName}). 2–4 sentences. Address the reviewer by first name if natural. ` +
      `Sound human and specific, never robotic or salesy. ${positive ? 'Thank them genuinely.' : 'Apologize sincerely, take responsibility, and invite them to make it right offline.'} ` +
      `Output ONLY the reply text — no preamble, no quotes.`;
    const user =
      `Reviewer: ${input.reviewerName}\nRating: ${input.rating}/5\nReview: ${input.reviewText ?? '(no text)'}`;

    try {
      const msg = await this.client.messages.create({
        model: REPLY_MODEL,
        max_tokens: 400,
        system,
        messages: [{ role: 'user', content: user }],
      });
      const text = msg.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('')
        .trim();
      return text || this.templateReply(input);
    } catch (err) {
      this.logger.error(`Claude draftReply failed: ${err instanceof Error ? err.message : err}`);
      return this.templateReply(input);
    }
  }

  private templateReply(input: DraftReplyInput): string {
    const first = input.reviewerName.trim().split(/\s+/)[0] || 'there';
    if (input.rating >= 4) {
      return `Thank you so much, ${first}! We're thrilled you had a great experience at ${input.businessName}, and we can't wait to welcome you back.`;
    }
    if (input.rating <= 2) {
      return `Hi ${first}, we're sorry your experience at ${input.businessName} fell short. We'd really like to make this right — please reach out to us directly so we can help.`;
    }
    return `Thanks for the feedback, ${first}. We appreciate you taking the time, and we're always working to make ${input.businessName} better.`;
  }
}
