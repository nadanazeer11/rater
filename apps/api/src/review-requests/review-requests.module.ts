import { Module } from '@nestjs/common';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { CustomersModule } from '../customers/customers.module';
import { ReviewRequestsController } from './review-requests.controller';
import { ReviewRequestsRepository } from './review-requests.repository';
import { ReviewRequestsService } from './review-requests.service';

@Module({
  imports: [CustomersModule, CampaignsModule],
  controllers: [ReviewRequestsController],
  providers: [ReviewRequestsService, ReviewRequestsRepository],
})
export class ReviewRequestsModule {}
