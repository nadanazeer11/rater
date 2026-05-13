import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'node:path';
import { AuthModule } from './auth/auth.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { CommonModule } from './common/common.module';
import { CustomersModule } from './customers/customers.module';
import { HealthModule } from './health/health.module';
import { InvitationsModule } from './invitations/invitations.module';
import { LocationsModule } from './locations/locations.module';
import { MeModule } from './me/me.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';
import { ReviewRequestsModule } from './review-requests/review-requests.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(__dirname, '../../../.env'), join(__dirname, '../../../.env.local')],
    }),
    CommonModule,
    PrismaModule,
    QueueModule,
    AuthModule,
    HealthModule,
    MeModule,
    OnboardingModule,
    LocationsModule,
    CustomersModule,
    CampaignsModule,
    ReviewRequestsModule,
    InvitationsModule,
  ],
})
export class AppModule {}
