import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth-user.type';
import { OnboardingDto } from './dto/onboarding.dto';
import type { OnboardingResultDto } from './dto/onboarding-result.response';
import { OnboardingService } from './onboarding.service';

@Controller('onboarding')
@UseGuards(AuthGuard)
export class OnboardingController {
  constructor(private readonly service: OnboardingService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: OnboardingDto,
  ): Promise<OnboardingResultDto> {
    return this.service.run(user, dto);
  }
}
