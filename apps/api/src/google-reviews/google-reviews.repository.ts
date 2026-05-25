import { Injectable } from '@nestjs/common';
import { Prisma } from '@rater/db';
import { PrismaService } from '../prisma/prisma.service';
import type { SortValue } from './dto/list-google-reviews.query.dto';

export interface ListPageArgs {
  locationId: string;
  page: number;
  pageSize: number;
  search?: string;
  rating?: number;
  sort: SortValue;
}

const SORT_ORDER: Record<SortValue, Prisma.GoogleReviewOrderByWithRelationInput[]> = {
  newest: [{ postedAt: 'desc' }],
  oldest: [{ postedAt: 'asc' }],
  highest: [{ rating: 'desc' }, { postedAt: 'desc' }],
  lowest: [{ rating: 'asc' }, { postedAt: 'desc' }],
};

@Injectable()
export class GoogleReviewsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMembership(authUserId: string, locationId: string) {
    return this.prisma.locationUser.findFirst({
      where: { authUserId, locationId },
      select: { id: true, role: true },
    });
  }

  async listPage(args: ListPageArgs) {
    const { locationId, page, pageSize, search, rating, sort } = args;

    const where: Prisma.GoogleReviewWhereInput = {
      locationId,
      removedAt: null,
    };

    if (rating !== undefined) where.rating = rating;

    const trimmed = search?.trim();
    if (trimmed) {
      where.OR = [
        { reviewerName: { contains: trimmed, mode: 'insensitive' } },
        { text: { contains: trimmed, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.googleReview.findMany({
        where,
        orderBy: SORT_ORDER[sort],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.googleReview.count({ where }),
    ]);

    return { items, total };
  }
}
