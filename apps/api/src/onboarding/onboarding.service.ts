import { ConflictException, Injectable, Logger } from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.type';
import { ScrapeQueue } from '../queue/scrape.queue';
import type { OnboardingDto } from './dto/onboarding.dto';
import type { OnboardingResultDto } from './dto/onboarding-result.response';
import { OnboardingRepository } from './onboarding.repository';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private readonly repo: OnboardingRepository,
    private readonly scrapeQueue: ScrapeQueue,
  ) {}

  async run(user: AuthUser, dto: OnboardingDto): Promise<OnboardingResultDto> {
    const existingMembership = await this.repo.findAnyMembership(user.id);
    if (existingMembership) {
      throw new ConflictException('User has already completed onboarding');
    }

    const created = await this.repo.runInTransaction(async (tx) => {
      const business = await this.repo.createBusinessInTx(tx, { name: dto.businessName });

      const locations = await Promise.all(
        dto.locations.map((loc) =>
          this.repo.createLocationInTx(tx, {
            businessId: business.id,
            name: loc.name,
            googlePlaceId: loc.googlePlaceId,
            googleReviewUrl: loc.googleReviewUrl ?? null,
            googleRating: loc.googleRating ?? null,
            googleReviewsCount: loc.googleReviewsCount ?? null,
            googleAddress: loc.googleAddress ?? null,
          }),
        ),
      );

      await Promise.all(
        locations.map((loc) =>
          this.repo.createMembershipInTx(tx, {
            locationId: loc.id,
            authUserId: user.id,
            email: user.email,
            role: 'admin',
          }),
        ),
      );

      this.logger.log(
        `Onboarded user ${user.id}: business=${business.id}, locations=[${locations.map((l) => l.id).join(',')}]`,
      );

      return {
        businessId: business.id,
        locations: locations.map((l) => ({ id: l.id, googlePlaceId: l.googlePlaceId })),
      };
    });

    await Promise.all(
      created.locations
        .filter((l) => l.googlePlaceId)
        .map((l) => this.scrapeQueue.enqueueBaseline(l.id)),
    );

    return {
      businessId: created.businessId,
      locationIds: created.locations.map((l) => l.id),
    };
  }
}
