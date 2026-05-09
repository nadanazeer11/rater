import { ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { ScrapeQueue } from '../queue/scrape.queue';
import type { CreateLocationDto } from './locations.dto';

@Injectable()
export class LocationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scrapeQueue: ScrapeQueue,
  ) {}

  /** Adds a new Location under the Business this user already admins.
   *  Only admins can add — invited members can't. */
  async createForCurrentBusiness(user: AuthUser, dto: CreateLocationDto) {
    const adminMembership = await this.prisma.locationUser.findFirst({
      where: { authUserId: user.id, role: 'admin' },
      select: { location: { select: { businessId: true } } },
    });

    if (!adminMembership) {
      throw new ForbiddenException(
        'Only admins can add locations. Ask your admin to invite you to a location.',
      );
    }

    const businessId = adminMembership.location.businessId;

    const location = await this.prisma.$transaction(async (tx) => {
      const loc = await tx.location.create({
        data: {
          businessId,
          name: dto.name,
          googlePlaceId: dto.googlePlaceId,
          googleReviewUrl: dto.googleReviewUrl ?? null,
          googleRating: dto.googleRating ?? null,
          googleReviewsCount: dto.googleReviewsCount ?? null,
          googleAddress: dto.googleAddress ?? null,
        },
      });

      await tx.locationUser.create({
        data: {
          locationId: loc.id,
          authUserId: user.id,
          email: user.email,
          role: 'admin',
        },
      });

      return loc;
    });

    if (location.googlePlaceId) {
      await this.scrapeQueue.enqueueBaseline(location.id);
    }

    return location;
  }
}
