import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth-user.type';
import { CreateReviewRequestDto } from './dto/create-review-request.dto';
import { FeedbackDto } from './dto/feedback.dto';
import { ImportReviewRequestsDto } from './dto/import-review-requests.dto';
import { RateDto } from './dto/rate.dto';
import type {
  ImportRequestsResultDto,
  PublicReviewRequestDto,
  RateResultDto,
  RequestCreatedDto,
  RequestSummaryDto,
} from './dto/review-request.response';
import { ReviewRequestsService } from './review-requests.service';

@Controller('review-requests')
export class ReviewRequestsController {
  constructor(private readonly service: ReviewRequestsService) {}

  @Post()
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  createOne(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateReviewRequestDto,
  ): Promise<RequestCreatedDto> {
    return this.service.createOne(user, dto);
  }

  @Post('import')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  importMany(
    @CurrentUser() user: AuthUser,
    @Body() dto: ImportReviewRequestsDto,
  ): Promise<ImportRequestsResultDto> {
    return this.service.importMany(user, dto);
  }

  @Get()
  @UseGuards(AuthGuard)
  list(
    @CurrentUser() user: AuthUser,
    @Query('locationId') locationId: string,
  ): Promise<RequestSummaryDto[]> {
    return this.service.list(user, locationId);
  }

  // --- public (token-based, no auth) ---

  @Get('by-token/:token')
  getByToken(@Param('token') token: string): Promise<PublicReviewRequestDto> {
    return this.service.getByToken(token);
  }

  @Post('by-token/:token/rate')
  @HttpCode(HttpStatus.OK)
  rate(
    @Param('token') token: string,
    @Body() dto: RateDto,
    @Ip() ip: string | undefined,
    @Headers('user-agent') userAgent: string | undefined,
  ): Promise<RateResultDto> {
    return this.service.rate(token, dto, {
      ip: ip ?? null,
      userAgent: userAgent ?? null,
    });
  }

  @Post('by-token/:token/feedback')
  @HttpCode(HttpStatus.OK)
  submitFeedback(
    @Param('token') token: string,
    @Body() dto: FeedbackDto,
  ): Promise<{ ok: true }> {
    return this.service.submitFeedback(token, dto);
  }
}
