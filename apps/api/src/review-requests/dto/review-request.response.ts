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
  redirectedToGoogle!: boolean;
  /** The 1–5 stars they gave, or null if not rated yet. */
  rating!: number | null;
  /** Their private feedback text (low ratings only), or null. */
  feedback!: string | null;
  createdAt!: Date;
  rateUrl!: string;
}

export class PublicReviewRequestDto {
  businessName!: string;
  locationName!: string;
  alreadyRated!: boolean;
  rating!: number | null;
  googleReviewUrl!: string | null;
}

export class RateResultDto {
  routedTo!: 'google' | 'feedback';
  googleReviewUrl!: string | null;
}
