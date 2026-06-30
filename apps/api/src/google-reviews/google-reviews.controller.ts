import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth-user.type';
import type {
  GoogleReviewsPageDto,
  ReviewReplyDraftDto,
  ReviewsSummaryDto,
} from './dto/google-review.response';
import { ListGoogleReviewsQueryDto } from './dto/list-google-reviews.query.dto';
import { GoogleReviewsService } from './google-reviews.service';

@Controller('google-reviews')
@UseGuards(AuthGuard)
export class GoogleReviewsController {
  constructor(private readonly service: GoogleReviewsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListGoogleReviewsQueryDto,
  ): Promise<GoogleReviewsPageDto> {
    return this.service.list(user, query);
  }

  @Get('summary')
  summary(
    @CurrentUser() user: AuthUser,
    @Query('locationId') locationId: string,
  ): Promise<ReviewsSummaryDto> {
    return this.service.summary(user, locationId);
  }

  @Post(':id/draft-reply')
  @HttpCode(HttpStatus.OK)
  draftReply(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<ReviewReplyDraftDto> {
    return this.service.draftReply(user, id);
  }
}
