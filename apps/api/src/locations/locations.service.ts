import { ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.type';
import { ScrapeQueue } from '../queue/scrape.queue';
import type { CreateLocationDto } from './dto/create-location.dto';
import type { LocationResponseDto } from './dto/location.response';
import { toLocationResponse } from './locations.mapper';
import { LocationsRepository } from './locations.repository';

@Injectable()
export class LocationsService {
  constructor(
    private readonly repo: LocationsRepository,
    private readonly scrapeQueue: ScrapeQueue,
  ) {}

  /** Adds a new Location under the Business this user already admins.
   *  Only admins can add — invited members can't. */
  async createForCurrentBusiness(
    user: AuthUser,
    dto: CreateLocationDto,
  ): Promise<LocationResponseDto> {
    const adminMembership = await this.repo.findAdminMembership(user.id);
    if (!adminMembership) {
      throw new ForbiddenException(
        'Only admins can add locations. Ask your admin to invite you to a location.',
      );
    }

    const businessId = adminMembership.location.businessId;

    const location = await this.repo.runInTransaction(async (tx) => {
      const loc = await this.repo.createLocationInTx(tx, {
        businessId,
        name: dto.name,
        googlePlaceId: dto.googlePlaceId,
        googleReviewUrl: dto.googleReviewUrl ?? null,
        googleRating: dto.googleRating ?? null,
        googleReviewsCount: dto.googleReviewsCount ?? null,
        googleAddress: dto.googleAddress ?? null,
      });

      await this.repo.createMembershipInTx(tx, {
        locationId: loc.id,
        authUserId: user.id,
        email: user.email,
        role: 'admin',
      });

      return loc;
    });

    if (location.googlePlaceId) {
      await this.scrapeQueue.enqueueBaseline(location.id);
    }

    return toLocationResponse(location);
  }
}
