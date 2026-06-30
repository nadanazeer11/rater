import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PendingAttributionMatch } from '@rater/types';
import type { AuthUser } from '../auth/auth-user.type';
import { AttributionQueue } from '../queue/attribution.queue';
import { toPendingMatch } from './attribution.mapper';
import { AttributionRepository } from './attribution.repository';

@Injectable()
export class AttributionService {
  constructor(
    private readonly repo: AttributionRepository,
    private readonly queue: AttributionQueue,
  ) {}

  private async assertMember(user: AuthUser, locationId: string): Promise<void> {
    if (!locationId) throw new BadRequestException('locationId is required.');
    const membership = await this.repo.findMembership(user.id, locationId);
    if (!membership) {
      throw new ForbiddenException('You are not a member of this location.');
    }
  }

  async listPending(user: AuthUser, locationId: string): Promise<PendingAttributionMatch[]> {
    await this.assertMember(user, locationId);
    const rows = await this.repo.listPending(locationId);
    return rows.map(toPendingMatch);
  }

  async confirm(user: AuthUser, reviewId: string): Promise<{ ok: true }> {
    const review = await this.repo.findTentative(reviewId);
    if (!review || !review.attributedReviewRequestId || !review.attributedReviewRequest) {
      throw new NotFoundException('No pending match for this review.');
    }
    await this.assertMember(user, review.locationId);
    await this.repo.confirm(
      review.id,
      review.attributedReviewRequestId,
      review.attributedReviewRequest.customerId,
    );
    return { ok: true };
  }

  async reject(user: AuthUser, reviewId: string): Promise<{ ok: true }> {
    const review = await this.repo.findTentative(reviewId);
    if (!review || !review.attributedReviewRequestId) {
      throw new NotFoundException('No pending match for this review.');
    }
    await this.assertMember(user, review.locationId);
    await this.repo.reject(review.id, review.attributedReviewRequestId);
    return { ok: true };
  }

  /** Manual "check Google now" — enqueues an incremental sync for the location. */
  async syncNow(user: AuthUser, locationId: string): Promise<{ ok: true }> {
    await this.assertMember(user, locationId);
    await this.queue.enqueueSync(locationId);
    return { ok: true };
  }
}
