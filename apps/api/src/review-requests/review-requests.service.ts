import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.type';
import { CampaignsRepository } from '../campaigns/campaigns.repository';
import { CustomersRepository } from '../customers/customers.repository';
import type { CreateReviewRequestDto } from './dto/create-review-request.dto';
import type { FeedbackDto } from './dto/feedback.dto';
import type { ImportReviewRequestsDto } from './dto/import-review-requests.dto';
import type { RateDto } from './dto/rate.dto';
import type {
  ImportRequestsResultDto,
  PublicReviewRequestDto,
  RateResultDto,
  RequestCreatedDto,
  RequestSummaryDto,
} from './dto/review-request.response';
import { toRequestSummary } from './review-requests.mapper';
import { ReviewRequestsRepository } from './review-requests.repository';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DAY_MS = 86_400_000;

function normEmail(raw: string): string {
  return raw.trim().toLowerCase();
}
function normOptional(raw: string | undefined): string | null {
  const v = raw?.trim();
  return v ? v : null;
}

@Injectable()
export class ReviewRequestsService {
  constructor(
    private readonly repo: ReviewRequestsRepository,
    private readonly customers: CustomersRepository,
    private readonly campaigns: CampaignsRepository,
  ) {}

  private rateUrl(token: string): string {
    return `${APP_URL}/rate/${token}`;
  }

  private async assertMember(user: AuthUser, locationId: string): Promise<void> {
    if (!locationId) throw new BadRequestException('locationId is required.');
    const membership = await this.repo.findMembership(user.id, locationId);
    if (!membership) {
      throw new ForbiddenException('You are not a member of this location.');
    }
  }

  /** Resolve which campaign a request runs: the caller's pick (validated against
   *  the location) or the location's default (newest active, created on first use). */
  private async resolveCampaignId(
    locationId: string,
    campaignId: string | undefined,
  ): Promise<string> {
    if (campaignId) {
      const campaign = await this.campaigns.findActiveByIdAndLocation(campaignId, locationId);
      if (!campaign) throw new NotFoundException('Campaign not found.');
      return campaign.id;
    }
    const { id } = await this.campaigns.getOrCreateDefault(locationId);
    return id;
  }

  async createOne(
    user: AuthUser,
    dto: CreateReviewRequestDto,
  ): Promise<RequestCreatedDto> {
    await this.assertMember(user, dto.locationId);
    const location = await this.repo.findLocation(dto.locationId);
    if (!location) throw new NotFoundException('Location not found.');

    const email = normEmail(dto.customer.email);
    let customer = await this.customers.findActiveByEmail(dto.locationId, email);
    if (!customer) {
      customer = await this.customers.create({
        locationId: dto.locationId,
        email,
        name: dto.customer.name.trim(),
        phone: normOptional(dto.customer.phone),
        importSource: 'manual',
      });
    }

    const since = new Date(Date.now() - location.customerCooldownDays * DAY_MS);
    const recent = await this.repo.findRecentRequestForCustomer(customer.id, since);
    if (recent) {
      throw new ConflictException(
        `You already requested a review from ${email} in the last ${location.customerCooldownDays} days.`,
      );
    }

    const campaignId = await this.resolveCampaignId(dto.locationId, dto.campaignId);
    const req = await this.repo.createRequestWithEvent({
      locationId: dto.locationId,
      customerId: customer.id,
      campaignId,
      via: 'manual',
    });
    return { id: req.id, publicToken: req.publicToken, rateUrl: this.rateUrl(req.publicToken) };
  }

  async importMany(
    user: AuthUser,
    dto: ImportReviewRequestsDto,
  ): Promise<ImportRequestsResultDto> {
    await this.assertMember(user, dto.locationId);
    const location = await this.repo.findLocation(dto.locationId);
    if (!location) throw new NotFoundException('Location not found.');

    const received = dto.rows.length;
    let skippedInvalid = 0;
    let skippedDuplicates = 0;
    let skippedCooldown = 0;
    let created = 0;

    const seen = new Set<string>();
    const rows: { email: string; name: string | null; phone: string | null }[] = [];
    for (const r of dto.rows) {
      const email = normEmail(r.email ?? '');
      if (!EMAIL_RE.test(email)) {
        skippedInvalid += 1;
        continue;
      }
      if (seen.has(email)) {
        skippedDuplicates += 1;
        continue;
      }
      seen.add(email);
      rows.push({ email, name: normOptional(r.name), phone: normOptional(r.phone) });
    }

    const existing = await this.customers.findManyByEmails(
      dto.locationId,
      rows.map((r) => r.email),
    );
    const customerIdByEmail = new Map(existing.map((c) => [c.email, c.id]));
    const since = new Date(Date.now() - location.customerCooldownDays * DAY_MS);
    const recentIds = new Set(
      await this.repo.findRecentRequestCustomerIds([...customerIdByEmail.values()], since),
    );

    const campaignId = await this.resolveCampaignId(dto.locationId, dto.campaignId);
    for (const row of rows) {
      let customerId = customerIdByEmail.get(row.email);
      if (customerId && recentIds.has(customerId)) {
        skippedCooldown += 1;
        continue;
      }
      if (!customerId) {
        const c = await this.customers.create({
          locationId: dto.locationId,
          email: row.email,
          name: row.name,
          phone: row.phone,
          importSource: 'csv',
        });
        customerId = c.id;
      }
      await this.repo.createRequestWithEvent({
        locationId: dto.locationId,
        customerId,
        campaignId,
        via: 'csv',
      });
      created += 1;
    }

    return { received, created, skippedDuplicates, skippedInvalid, skippedCooldown };
  }

  async list(user: AuthUser, locationId: string): Promise<RequestSummaryDto[]> {
    await this.assertMember(user, locationId);
    const rows = await this.repo.listByLocation(locationId);
    return rows.map((r) => toRequestSummary(r, this.rateUrl(r.publicToken)));
  }

  // --- public (token-based, no auth) ---

  async getByToken(token: string): Promise<PublicReviewRequestDto> {
    const r = await this.repo.findByPublicToken(token);
    if (!r) throw new NotFoundException('This review link is not valid.');
    if (r.engagementStatus === 'not_opened') {
      await this.repo.markLanded(r.id);
    }
    return {
      businessName: r.location.business.name,
      locationName: r.location.name,
      alreadyRated: r.ratingSubmission !== null,
      rating: r.ratingSubmission?.rating ?? null,
      googleReviewUrl: r.location.googleReviewUrl,
    };
  }

  async rate(
    token: string,
    dto: RateDto,
    ctx: { ip: string | null; userAgent: string | null },
  ): Promise<RateResultDto> {
    const r = await this.repo.findByPublicToken(token);
    if (!r) throw new NotFoundException('This review link is not valid.');
    if (r.ratingSubmission) throw new ConflictException('You have already rated this.');

    const routedTo: 'google' | 'feedback' =
      dto.rating >= r.location.positiveRatingThreshold ? 'google' : 'feedback';
    const ratingStatus = routedTo === 'google' ? 'rated_positive' : 'rated_negative';
    // We routed them to Google (and there's a URL to land on) → the future
    // attribution sync should check whether they actually posted a review.
    const googleAttributionStatus =
      routedTo === 'google' && r.location.googleReviewUrl ? 'pending_check' : 'not_applicable';
    await this.repo.createRating(r.id, {
      rating: dto.rating,
      routedTo,
      ratingStatus,
      googleAttributionStatus,
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return {
      routedTo,
      googleReviewUrl: routedTo === 'google' ? r.location.googleReviewUrl : null,
    };
  }

  /** Records that the customer clicked through to Google (idempotent — keeps the
   *  first click time). No-ops on an unknown token. */
  async markRedirectedToGoogle(token: string): Promise<void> {
    await this.repo.markRedirectedToGoogleByToken(token);
  }

  async submitFeedback(token: string, dto: FeedbackDto): Promise<{ ok: true }> {
    const r = await this.repo.findByPublicToken(token);
    if (!r) throw new NotFoundException('This review link is not valid.');
    if (!r.ratingSubmission || r.ratingSubmission.routedTo !== 'feedback') {
      throw new ConflictException('No feedback is expected for this review.');
    }
    if (r.feedbackSubmission) throw new ConflictException('Feedback has already been submitted.');
    await this.repo.createFeedback(r.id, dto.text.trim());
    return { ok: true };
  }
}
