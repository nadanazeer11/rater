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

export class SenderSettingsDto {
  senderProvider!: string;
  replyToEmail!: string | null;
  fromEmailDomain!: string | null;
  fromEmailDomainVerified!: boolean;
  postmarkMessageStream!: string | null;
  postmarkConfigured!: boolean;
  sharedFromEmail!: string;
}
