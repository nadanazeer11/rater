import {
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { ScrapeQueue } from '../queue/scrape.queue';
import type { OnboardingDto } from './onboarding.dto';

export type OnboardingResult = {
  businessId: string;
  locationIds: string[];
};

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scrapeQueue: ScrapeQueue,
  ) {}

  async run(user: AuthUser, dto: OnboardingDto): Promise<OnboardingResult> {
    const existingMembership = await this.prisma.locationUser.findFirst({
      where: { authUserId: user.id },
      select: { id: true },
    });

    if (existingMembership) {
      throw new ConflictException('User has already completed onboarding');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const business = await tx.business.create({
        data: { name: dto.businessName },
      });

      const locations = await Promise.all(
        dto.locations.map((loc) =>
          tx.location.create({
            data: {
              businessId: business.id,
              name: loc.name,
              googlePlaceId: loc.googlePlaceId,
              googleReviewUrl: loc.googleReviewUrl ?? null,
              googleRating: loc.googleRating ?? null,
              googleReviewsCount: loc.googleReviewsCount ?? null,
              googleAddress: loc.googleAddress ?? null,
            },
          }),
        ),
      );

      await Promise.all(
        locations.map((loc) =>
          tx.locationUser.create({
            data: {
              locationId: loc.id,
              authUserId: user.id,
              email: user.email,
              role: 'admin',
            },
          }),
        ),
      );

      this.logger.log(
        `Onboarded user ${user.id}: business=${business.id}, locations=[${locations.map((l) => l.id).join(',')}]`,
      );

      return {
        businessId: business.id,
        locationIds: locations.map((l) => l.id),
        placeIds: locations.map((l) => l.googlePlaceId),
      };
    });

    await Promise.all(
      result.locationIds
        .filter((_, i) => result.placeIds[i])
        .map((id) => this.scrapeQueue.enqueueBaseline(id)),
    );

    return {
      businessId: result.businessId,
      locationIds: result.locationIds,
    };
  }
}
