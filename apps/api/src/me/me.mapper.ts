import type { AuthUser } from '../auth/auth-user.type';
import { MeResponseDto } from './dto/me.response';
import type { MembershipWithLocation } from './me.repository';

export function toMeResponse(
  user: AuthUser,
  memberships: MembershipWithLocation[],
): MeResponseDto {
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
      baselineScrapedAt: m.location.baselineScrapedAt?.toISOString() ?? null,
      createdAt: m.location.createdAt.toISOString(),
    })),
  };
}
