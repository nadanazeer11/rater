import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'node:path';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { InvitationsModule } from './invitations/invitations.module';
import { LocationsModule } from './locations/locations.module';
import { MeModule } from './me/me.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(__dirname, '../../../.env'), join(__dirname, '../../../.env.local')],
    }),
    PrismaModule,
    QueueModule,
    AuthModule,
    HealthModule,
    MeModule,
    OnboardingModule,
    LocationsModule,
    InvitationsModule,
  ],
})
export class AppModule {}
