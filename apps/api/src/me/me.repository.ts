import { Injectable } from '@nestjs/common';
import { Prisma } from '@rater/db';
import { PrismaService } from '../prisma/prisma.service';

export type MembershipWithLocation = Prisma.LocationUserGetPayload<{
  select: {
    role: true;
    location: {
      select: {
        id: true;
        name: true;
        createdAt: true;
        googleRating: true;
        googleReviewsCount: true;
        googleAddress: true;
        baselineScrapedAt: true;
        business: { select: { id: true; name: true } };
      };
    };
  };
}>;

@Injectable()
export class MeRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMembershipsWithLocation(authUserId: string): Promise<MembershipWithLocation[]> {
    return this.prisma.locationUser.findMany({
      where: { authUserId },
      select: {
        role: true,
        location: {
          select: {
            id: true,
            name: true,
            createdAt: true,
            googleRating: true,
            googleReviewsCount: true,
            googleAddress: true,
            baselineScrapedAt: true,
            business: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
