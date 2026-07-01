import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import type { ReviewSentiment } from '@rater/types';

const STUB_VALUES = ['', 'stub', 'placeholder', 'todo'];
const MODEL = 'claude-haiku-4-5-20251001';
const CHUNK = 30;

export interface SentimentItem {
  id: string;
  text: string | null;
  rating: number;
}

function ratingBand(rating: number): ReviewSentiment {
  if (rating >= 4) return 'positive';
  if (rating <= 2) return 'negative';
  return 'neutral';
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
      this.logger.warn('ANTHROPIC_API_KEY unset/stub — sentiment falls back to rating bands.');
    }
  }

  /** Classifies each review's sentiment. Reviews without text (or when no API key
   *  is set) fall back to the star-rating band. Returns id -> sentiment. */
  async classifySentiment(items: SentimentItem[]): Promise<Map<string, ReviewSentiment>> {
    const out = new Map<string, ReviewSentiment>();
    if (items.length === 0) return out;

    // Text-less reviews (and the whole batch when stubbed) use the rating band.
    const needAi: SentimentItem[] = [];
    for (const item of items) {
      if (this.stubbed || !item.text?.trim()) out.set(item.id, ratingBand(item.rating));
      else needAi.push(item);
    }
    if (needAi.length === 0 || !this.client) return out;

    for (let i = 0; i < needAi.length; i += CHUNK) {
      const chunk = needAi.slice(i, i + CHUNK);
      try {
        const parsed = await this.classifyChunk(chunk);
        for (const item of chunk) {
          out.set(item.id, parsed.get(item.id) ?? ratingBand(item.rating));
        }
      } catch (err) {
        this.logger.error(`Sentiment chunk failed, using rating bands: ${err instanceof Error ? err.message : err}`);
        for (const item of chunk) out.set(item.id, ratingBand(item.rating));
      }
    }
    return out;
  }

  private async classifyChunk(chunk: SentimentItem[]): Promise<Map<string, ReviewSentiment>> {
    const list = chunk.map((c) => `${c.id}: ${JSON.stringify((c.text ?? '').slice(0, 500))}`).join('\n');
    const msg = await this.client!.messages.create({
      model: MODEL,
      max_tokens: 1000,
      system:
        'Classify the sentiment of each customer review as "positive", "neutral", or "negative". ' +
        'Judge the reviewer\'s attitude from the text (not just politeness). Respond with ONLY a JSON object ' +
        'mapping each id to one of those three words. No prose, no code fences.',
      messages: [{ role: 'user', content: list }],
    });
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();
    const json = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    const raw = JSON.parse(json) as Record<string, string>;
    const map = new Map<string, ReviewSentiment>();
    for (const [id, v] of Object.entries(raw)) {
      if (v === 'positive' || v === 'neutral' || v === 'negative') map.set(id, v);
    }
    return map;
  }
}
