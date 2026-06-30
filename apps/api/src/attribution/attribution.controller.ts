import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { PendingAttributionMatch } from '@rater/types';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth-user.type';
import { AttributionService } from './attribution.service';
import { SyncNowDto } from './dto/sync.dto';

@Controller('attribution')
@UseGuards(AuthGuard)
export class AttributionController {
  constructor(private readonly service: AttributionService) {}

  @Get('pending')
  listPending(
    @CurrentUser() user: AuthUser,
    @Query('locationId') locationId: string,
  ): Promise<PendingAttributionMatch[]> {
    return this.service.listPending(user, locationId);
  }

  @Post(':reviewId/confirm')
  @HttpCode(HttpStatus.OK)
  confirm(
    @CurrentUser() user: AuthUser,
    @Param('reviewId') reviewId: string,
  ): Promise<{ ok: true }> {
    return this.service.confirm(user, reviewId);
  }

  @Post(':reviewId/reject')
  @HttpCode(HttpStatus.OK)
  reject(
    @CurrentUser() user: AuthUser,
    @Param('reviewId') reviewId: string,
  ): Promise<{ ok: true }> {
    return this.service.reject(user, reviewId);
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  syncNow(
    @CurrentUser() user: AuthUser,
    @Body() dto: SyncNowDto,
  ): Promise<{ ok: true }> {
    return this.service.syncNow(user, dto.locationId);
  }
}
