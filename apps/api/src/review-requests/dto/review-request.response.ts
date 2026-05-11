export class RequestCreatedDto {
  id!: string;
  publicToken!: string;
  rateUrl!: string;
}

export class ImportRequestsResultDto {
  received!: number;
  created!: number;
  skippedDuplicates!: number;
  skippedInvalid!: number;
  skippedCooldown!: number;
}

export class RequestSummaryDto {
  id!: string;
  customer!: { name: string | null; email: string };
  deliveryStatus!: string;
  engagementStatus!: string;
  ratingStatus!: string;
  googleAttributionStatus!: string;
  createdAt!: Date;
  rateUrl!: string;
}

export class PublicReviewRequestDto {
  businessName!: string;
  locationName!: string;
  alreadyRated!: boolean;
  rating!: number | null;
}

export class RateResultDto {
  routedTo!: 'google' | 'feedback';
  googleReviewUrl!: string | null;
}
