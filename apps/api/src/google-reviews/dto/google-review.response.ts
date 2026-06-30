export class GoogleReviewResponseDto {
  id!: string;
  externalId!: string;
  reviewerName!: string;
  reviewerAvatarUrl!: string | null;
  rating!: number;
  text!: string | null;
  language!: string | null;
  postedAt!: Date;
  ownerReplyText!: string | null;
  ownerRepliedAt!: Date | null;
  attributedReviewRequestId!: string | null;
  attributionConfidence!: string | null;
  createdAt!: Date;
}

export class GoogleReviewsPageDto {
  items!: GoogleReviewResponseDto[];
  total!: number;
  page!: number;
  pageSize!: number;
}

export class ReviewsSummaryDto {
  total!: number;
  replied!: number;
  responseRate!: number;
}

export class ReviewReplyDraftDto {
  draft!: string;
}
