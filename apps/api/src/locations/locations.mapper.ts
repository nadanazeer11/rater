import type { Location } from '@rater/db';
import { LocationResponseDto } from './dto/location.response';

export function toLocationResponse(loc: Location): LocationResponseDto {
  return {
    id: loc.id,
    name: loc.name,
    googlePlaceId: loc.googlePlaceId,
    googleReviewUrl: loc.googleReviewUrl,
    googleRating: loc.googleRating,
    googleReviewsCount: loc.googleReviewsCount,
    googleAddress: loc.googleAddress,
    baselineScrapedAt: loc.baselineScrapedAt,
    createdAt: loc.createdAt,
  };
}
