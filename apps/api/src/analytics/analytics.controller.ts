import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import type { FunnelResponse, OverviewStats, SentimentTrend } from '@rater/types';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth-user.type';
import { AnalyticsService } from './analytics.service';
import {
  FunnelQueryDto,
  OverviewQueryDto,
  SentimentTrendQueryDto,
} from './dto/analytics.query.dto';

@Controller('analytics')
@UseGuards(AuthGuard)
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('overview')
  overview(
    @CurrentUser() user: AuthUser,
    @Query() query: OverviewQueryDto,
  ): Promise<OverviewStats> {
    return this.service.overview(user, query);
  }

  @Get('funnel')
  funnel(
    @CurrentUser() user: AuthUser,
    @Query() query: FunnelQueryDto,
  ): Promise<FunnelResponse> {
    return this.service.funnel(user, query);
  }

  @Get('sentiment-trend')
  sentimentTrend(
    @CurrentUser() user: AuthUser,
    @Query() query: SentimentTrendQueryDto,
  ): Promise<SentimentTrend> {
    return this.service.sentimentTrend(user, query);
  }
}
