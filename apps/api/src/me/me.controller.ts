import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth-user.type';
import { PrismaService } from '../prisma/prisma.service';

type LocationSummary = {
  id: string;
  name: string;
  role: string;
  business: { id: string; name: string };
  googleRating: number | null;
  googleReviewsCount: number | null;
  googleAddress: string | null;
};

type MeResponse = AuthUser & {
  onboarded: boolean;
  locations: LocationSummary[];
};

@Controller('me')
@UseGuards(AuthGuard)
export class MeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async me(@CurrentUser() user: AuthUser): Promise<MeResponse> {
    const memberships = await this.prisma.locationUser.findMany({
      where: { authUserId: user.id },
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
            business: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      id: user.id,
      email: user.email,
      onboarded: memberships.length > 0,
      locations: memberships.map((m) => ({
        id: m.location.id,
        name: m.location.name,
        role: m.role,
        business: m.location.business,
        googleRating: m.location.googleRating,
        googleReviewsCount: m.location.googleReviewsCount,
        googleAddress: m.location.googleAddress,
      })),
    };
  }
}
