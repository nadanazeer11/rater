export class BusinessSummaryDto {
  id!: string;
  name!: string;
}

export class LocationSummaryDto {
  id!: string;
  name!: string;
  role!: string;
  business!: BusinessSummaryDto;
  googleRating!: number | null;
  googleReviewsCount!: number | null;
  googleAddress!: string | null;
  baselineScrapedAt!: string | null;
  createdAt!: string;
}

export class MeResponseDto {
  id!: string;
  email!: string;
  onboarded!: boolean;
  locations!: LocationSummaryDto[];
}
