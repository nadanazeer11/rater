import type { RequestSummaryDto } from './dto/review-request.response';
import type { RequestWithCustomer } from './review-requests.repository';

export function toRequestSummary(r: RequestWithCustomer, rateUrl: string): RequestSummaryDto {
  return {
    id: r.id,
    customer: { name: r.customer.name, email: r.customer.email },
    deliveryStatus: r.deliveryStatus,
    engagementStatus: r.engagementStatus,
    ratingStatus: r.ratingStatus,
    googleAttributionStatus: r.googleAttributionStatus,
    redirectedToGoogle: r.redirectedToGoogleAt !== null,
    rating: r.ratingSubmission?.rating ?? null,
    feedback: r.feedbackSubmission?.text ?? null,
    createdAt: r.createdAt,
    rateUrl,
  };
}
