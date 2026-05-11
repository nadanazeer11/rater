export class LocationResponseDto {
  id!: string;
  name!: string;
  googlePlaceId!: string | null;
  googleReviewUrl!: string | null;
  googleRating!: number | null;
  googleReviewsCount!: number | null;
  googleAddress!: string | null;
  baselineScrapedAt!: Date | null;
  createdAt!: Date;
}
