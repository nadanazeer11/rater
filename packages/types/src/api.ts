/**
 * Wire-shape contracts for the rater HTTP API — the JSON the api actually
 * returns (so dates are ISO `string`s, not `Date`). The web app fetch helpers
 * are generic over these; the api's response DTOs mirror them.
 */

export interface BusinessSummary {
  id: string;
  name: string;
}

export interface LocationSummary {
  id: string;
  name: string;
  role: string;
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
  emailStatus: string;
  importSource: string;
  importedAt: string;
  createdAt: string;
}

export interface RequestSummary {
  id: string;
  customer: { name: string | null; email: string };
  deliveryStatus: string;
  engagementStatus: string;
  ratingStatus: string;
  googleAttributionStatus: string;
  redirectedToGoogle: boolean;
  /** The 1–5 stars they gave, or null if not rated yet. */
  rating: number | null;
  /** Their private feedback text (low ratings only), or null. */
  feedback: string | null;
  createdAt: string;
  rateUrl: string;
}

export interface ReviewRequestCreated {
  id: string;
  publicToken: string;
  rateUrl: string;
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
  routedTo: 'google' | 'feedback';
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

export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

export interface InvitationDetails {
  email: string;
  role: string;
  status: InvitationStatus;
  expiresAt: string;
  location: { id: string; name: string; businessName: string };
  invitedBy: { email: string; name: string | null } | null;
}

export interface InvitationCreated {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  shareUrl: string;
}

export interface InvitationAccepted {
  locationId: string;
  role: string;
}
