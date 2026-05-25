import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.type';
import type { GoogleReviewsPageDto } from './dto/google-review.response';
import { ListGoogleReviewsQueryDto } from './dto/list-google-reviews.query.dto';
import { toGoogleReviewsPage } from './google-reviews.mapper';
import { GoogleReviewsRepository } from './google-reviews.repository';

const DEFAULT_PAGE_SIZE = 20;

@Injectable()
export class GoogleReviewsService {
  constructor(private readonly repo: GoogleReviewsRepository) {}

  private async assertMember(user: AuthUser, locationId: string): Promise<void> {
    if (!locationId) throw new BadRequestException('locationId is required.');
    const membership = await this.repo.findMembership(user.id, locationId);
    if (!membership) {
      throw new ForbiddenException('You are not a member of this location.');
    }
  }

  async list(
    user: AuthUser,
    q: ListGoogleReviewsQueryDto,
  ): Promise<GoogleReviewsPageDto> {
    await this.assertMember(user, q.locationId);

    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? DEFAULT_PAGE_SIZE;

    const { items, total } = await this.repo.listPage({
      locationId: q.locationId,
      page,
      pageSize,
      search: q.search,
      rating: q.rating,
      sort: q.sort ?? 'newest',
    });

    return toGoogleReviewsPage(items, total, page, pageSize);
  }
}
