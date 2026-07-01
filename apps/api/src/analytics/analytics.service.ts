import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { FunnelResponse, OverviewStats, SentimentTrend } from '@rater/types';
import type { AuthUser } from '../auth/auth-user.type';
import { toFunnel, toSentimentTrend } from './analytics.mapper';
import { AnalyticsRepository } from './analytics.repository';
import type {
  FunnelQueryDto,
  OverviewQueryDto,
  SentimentTrendQueryDto,
} from './dto/analytics.query.dto';

const DEFAULT_TREND_MONTHS = 6;

@Injectable()
export class AnalyticsService {
  constructor(private readonly repo: AnalyticsRepository) {}

  private async assertMember(user: AuthUser, locationId: string): Promise<void> {
    if (!locationId) throw new BadRequestException('locationId is required.');
    const membership = await this.repo.findMembership(user.id, locationId);
    if (!membership) {
      throw new ForbiddenException('You are not a member of this location.');
    }
  }

  async overview(user: AuthUser, q: OverviewQueryDto): Promise<OverviewStats> {
    await this.assertMember(user, q.locationId);
    return this.repo.overview(q.locationId);
  }

  async funnel(user: AuthUser, q: FunnelQueryDto): Promise<FunnelResponse> {
    await this.assertMember(user, q.locationId);
    const counts = await this.repo.funnel({
      locationId: q.locationId,
      from: q.from,
      to: q.to,
      campaignId: q.campaignId,
    });
    return toFunnel(counts, q.from ?? null, q.to ?? null);
  }

  async sentimentTrend(user: AuthUser, q: SentimentTrendQueryDto): Promise<SentimentTrend> {
    await this.assertMember(user, q.locationId);
    const months = q.months ?? DEFAULT_TREND_MONTHS;
    const since = new Date();
    since.setMonth(since.getMonth() - (months - 1), 1);
    since.setHours(0, 0, 0, 0);
    const rows = await this.repo.sentimentTrendRows(q.locationId, since);
    return toSentimentTrend(rows, months);
  }
}
