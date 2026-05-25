import { Module } from '@nestjs/common';
import { GoogleReviewsController } from './google-reviews.controller';
import { GoogleReviewsRepository } from './google-reviews.repository';
import { GoogleReviewsService } from './google-reviews.service';

@Module({
  controllers: [GoogleReviewsController],
  providers: [GoogleReviewsService, GoogleReviewsRepository],
})
export class GoogleReviewsModule {}
