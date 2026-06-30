/**
 * Wire-shape contracts for the rater HTTP API — the JSON the api actually
 * returns (so dates are ISO `string`s, not `Date`). The web app fetch helpers
 * are generic over these; the api's response DTOs mirror them.
 */

import type {
  AttributionConfidence,
  CampaignDelayAnchor,
  CampaignStepType,
  DeliveryStatus,
  EmailStatus,
  EngagementStatus,
  GoogleAttributionStatus,
  ImportSource,
  InvitationStatus,
  RatingStatus,
  Role,
  RoutedTo,
  SenderProvider,
} from './enums';

export interface BusinessSummary {
  id: string;
  name: string;
}

/** The three location-overview cards. `baselineCaptured` lets the UI tell
 *  "0 new reviews" apart from "baseline not captured yet". */
export interface OverviewStats {
  requestsSent: number;
  awaitingResponse: number;
  newGoogleReviews: number;
  baselineCaptured: boolean;
}

export type FunnelStageKey =
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'rated'
  | 'routed'
  | 'posted';

export interface FunnelStage {
  key: FunnelStageKey;
  label: string;
  count: number;
  /** 0–100, relative to the first stage (`sent`). */
  pctOfStart: number;
  /** 0–100, relative to the previous stage. */
  pctOfPrev: number;
  /** True for `posted` until Google-review attribution lands — the count is
   *  not yet trustworthy, so the UI shows it as pending. */
  pending: boolean;
}

export interface FunnelResponse {
  stages: FunnelStage[];
  from: string | null;
  to: string | null;
}

export interface LocationSummary {
  id: string;
  name: string;
  role: Role;
  business: BusinessSummary;
  googleRating: number | null;
  googleReviewsCount: number | null;
  googleAddress: string | null;
  baselineScrapedAt: string | null;
  createdAt: string;
}

export interface MeResponse {
  id: string;
  email: string;
  onboarded: boolean;
  locations: LocationSummary[];
}

export interface CustomerSummary {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  emailStatus: EmailStatus;
  importSource: ImportSource;
  importedAt: string;
  createdAt: string;
}

export interface GoogleReviewSummary {
  id: string;
  externalId: string;
  reviewerName: string;
  reviewerAvatarUrl: string | null;
  rating: number;
  text: string | null;
  language: string | null;
  postedAt: string;
  attributedReviewRequestId: string | null;
  attributionConfidence: AttributionConfidence | null;
  createdAt: string;
}

export type GoogleReviewsSort = 'newest' | 'oldest' | 'highest' | 'lowest';

export interface GoogleReviewsPage {
  items: GoogleReviewSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface RequestSummary {
  id: string;
  customer: { name: string | null; email: string };
  campaignName: string;
  deliveryStatus: DeliveryStatus;
  engagementStatus: EngagementStatus;
  ratingStatus: RatingStatus;
  googleAttributionStatus: GoogleAttributionStatus;
  redirectedToGoogle: boolean;
  /** The 1–5 stars they gave, or null if not rated yet. */
  rating: number | null;
  /** Their private feedback text (low ratings only), or null. */
  feedback: string | null;
  createdAt: string;
  rateUrl: string;
}

/** One row in a review request's activity log. `kind` drives the icon; `event`
 *  is the open-ended fallback so a new Event.eventType still renders without a
 *  client change. */
export type TimelineKind =
  | 'created'
  | 'scheduled'
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'bounced'
  | 'complained'
  | 'failed'
  | 'skipped'
  | 'rated'
  | 'feedback'
  | 'redirected'
  | 'event';

export interface TimelineEntry {
  at: string;
  kind: TimelineKind;
  label: string;
  /** Secondary line — bounce reason, send error, feedback text, routing, etc. */
  detail: string | null;
}

export interface RequestTimeline {
  id: string;
  customer: { name: string | null; email: string };
  campaignName: string;
  deliveryStatus: DeliveryStatus;
  engagementStatus: EngagementStatus;
  ratingStatus: RatingStatus;
  googleAttributionStatus: GoogleAttributionStatus;
  rating: number | null;
  createdAt: string;
  entries: TimelineEntry[];
}

export interface ReviewRequestCreated {
  id: string;
  publicToken: string;
  rateUrl: string;
}

export interface CampaignStepDetail {
  id: string;
  stepOrder: number;
  stepType: CampaignStepType;
  delayDays: number;
  delayAnchor: CampaignDelayAnchor;
  requiredState: Record<string, string>;
  subjectTemplate: string;
  bodyTemplate: string;
}

/** A step as the editor submits it — order is the array index, id is server-assigned. */
export type CampaignStepInput = Omit<CampaignStepDetail, 'id' | 'stepOrder'>;

export interface CampaignSummary {
  id: string;
  name: string;
  /** True for the location's newest active campaign — the one new requests default to. */
  isDefault: boolean;
  stepCount: number;
  requestCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignDetail extends CampaignSummary {
  locationId: string;
  steps: CampaignStepDetail[];
}

export interface ImportRequestsResult {
  received: number;
  created: number;
  skippedDuplicates: number;
  skippedInvalid: number;
  skippedCooldown: number;
}

export interface PublicReviewRequest {
  businessName: string;
  locationName: string;
  alreadyRated: boolean;
  rating: number | null;
  googleReviewUrl: string | null;
}

export interface RateResult {
  routedTo: RoutedTo;
  googleReviewUrl: string | null;
}

export interface LocationResponse {
  id: string;
  name: string;
  googlePlaceId: string | null;
  googleReviewUrl: string | null;
  googleRating: number | null;
  googleReviewsCount: number | null;
  googleAddress: string | null;
  baselineScrapedAt: string | null;
  createdAt: string;
}

export interface OnboardingResult {
  businessId: string;
  locationIds: string[];
}

/** A location's email-sending configuration. The Postmark token is write-only —
 *  never returned; `postmarkConfigured` reports whether one is set. */
export interface SenderSettings {
  senderProvider: SenderProvider;
  replyToEmail: string | null;
  fromEmailDomain: string | null;
  fromEmailDomainVerified: boolean;
  postmarkMessageStream: string | null;
  postmarkConfigured: boolean;
  /** The platform's shared "via rater" from-address, shown for the `shared` option. */
  sharedFromEmail: string;
}

export interface UpdateSenderSettingsInput {
  senderProvider?: SenderProvider;
  replyToEmail?: string | null;
  fromEmailDomain?: string | null;
  postmarkServerToken?: string | null;
  postmarkMessageStream?: string | null;
}

export interface InvitationDetails {
  email: string;
  role: Role;
  status: InvitationStatus;
  expiresAt: string;
  location: { id: string; name: string; businessName: string };
  invitedBy: { email: string; name: string | null } | null;
}

export interface InvitationCreated {
  id: string;
  email: string;
  role: Role;
  expiresAt: string;
  shareUrl: string;
}

export interface InvitationAccepted {
  locationId: string;
  role: Role;
}
