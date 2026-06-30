import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@rater/db';
import type { AuthUser } from '../auth/auth-user.type';
import { ScrapeQueue } from '../queue/scrape.queue';
import type { CreateLocationDto } from './dto/create-location.dto';
import type { LocationResponseDto, SenderSettingsDto } from './dto/location.response';
import type { UpdateSenderSettingsDto } from './dto/update-sender-settings.dto';
import { toLocationResponse, toSenderSettings } from './locations.mapper';
import { LocationsRepository } from './locations.repository';

const DEFAULT_SHARED_FROM = 'reviews@example.com';

@Injectable()
export class LocationsService {
  constructor(
    private readonly repo: LocationsRepository,
    private readonly scrapeQueue: ScrapeQueue,
    private readonly config: ConfigService,
  ) {}

  private sharedFromEmail(): string {
    return (this.config.get<string>('POSTMARK_FROM_EMAIL') ?? DEFAULT_SHARED_FROM).trim();
  }

  private async assertLocationAdmin(user: AuthUser, locationId: string): Promise<void> {
    const membership = await this.repo.findAdminMembershipForLocation(user.id, locationId);
    if (!membership) {
      throw new ForbiddenException('Only admins of this location can change its settings.');
    }
  }

  async getSenderSettings(user: AuthUser, locationId: string): Promise<SenderSettingsDto> {
    await this.assertLocationAdmin(user, locationId);
    const row = await this.repo.findSenderSettings(locationId);
    if (!row) throw new NotFoundException('Location not found.');
    return toSenderSettings(row, this.sharedFromEmail());
  }

  async updateSenderSettings(
    user: AuthUser,
    locationId: string,
    dto: UpdateSenderSettingsDto,
  ): Promise<SenderSettingsDto> {
    await this.assertLocationAdmin(user, locationId);
    const current = await this.repo.findSenderSettings(locationId);
    if (!current) throw new NotFoundException('Location not found.');

    const data: Prisma.LocationUpdateInput = {};
    if (dto.senderProvider !== undefined) data.senderProvider = dto.senderProvider;
    if (dto.replyToEmail !== undefined) {
      data.replyToEmail = dto.replyToEmail ? dto.replyToEmail.trim().toLowerCase() : null;
    }
    if (dto.postmarkServerToken !== undefined) {
      data.postmarkServerToken = dto.postmarkServerToken?.trim() || null;
    }
    if (dto.postmarkMessageStream !== undefined) {
      data.postmarkMessageStream = dto.postmarkMessageStream?.trim() || null;
    }
    if (dto.fromEmailDomain !== undefined) {
      const next = dto.fromEmailDomain ? dto.fromEmailDomain.trim().toLowerCase() : null;
      data.fromEmailDomain = next;
      // A changed domain is unverified until it passes DNS — never send from an
      // unverified domain (the worker falls back to the shared address).
      if (next !== current.fromEmailDomain) data.fromEmailDomainVerified = false;
    }

    const updated = await this.repo.updateSenderSettings(locationId, data);
    return toSenderSettings(updated, this.sharedFromEmail());
  }

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

    const existing = await this.repo.findActiveByPlaceId(
      businessId,
      dto.googlePlaceId,
    );
    if (existing) {
      throw new ConflictException(
        `"${existing.name}" is already added to this business.`,
      );
    }

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
