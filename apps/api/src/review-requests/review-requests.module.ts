import { Module } from '@nestjs/common';
import { CustomersModule } from '../customers/customers.module';
import { ReviewRequestsController } from './review-requests.controller';
import { ReviewRequestsRepository } from './review-requests.repository';
import { ReviewRequestsService } from './review-requests.service';

@Module({
  imports: [CustomersModule],
  controllers: [ReviewRequestsController],
  providers: [ReviewRequestsService, ReviewRequestsRepository],
})
export class ReviewRequestsModule {}
