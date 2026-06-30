import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { FunnelResponse, OverviewStats } from '@rater/types';
import type { AuthUser } from '../auth/auth-user.type';
import { toFunnel } from './analytics.mapper';
import { AnalyticsRepository } from './analytics.repository';
import type { FunnelQueryDto, OverviewQueryDto } from './dto/analytics.query.dto';

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
}
