import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller';
import { OnboardingRepository } from './onboarding.repository';
import { OnboardingService } from './onboarding.service';

@Module({
  controllers: [OnboardingController],
  providers: [OnboardingService, OnboardingRepository],
})
export class OnboardingModule {}
