import type { RequestTimeline, TimelineEntry, TimelineKind } from '@rater/types';
import type { RequestSummaryDto } from './dto/review-request.response';
import type {
  RequestTimelineRow,
  RequestWithCustomer,
} from './review-requests.repository';

export function toRequestSummary(r: RequestWithCustomer, rateUrl: string): RequestSummaryDto {
  return {
    id: r.id,
    customer: { name: r.customer.name, email: r.customer.email },
    campaignName: r.campaign.name,
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

function asRecord(payload: unknown): Record<string, unknown> {
  return payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v : null;
}

/** Maps one Event to a timeline entry. Unknown event types fall back to a
 *  generic 'event' kind so a new Event.eventType renders without a code change
 *  (Event.eventType is intentionally open). `feedbackText` is threaded in
 *  because the feedback_submitted event payload doesn't carry it. */
function eventToEntry(
  eventType: string,
  payload: Record<string, unknown>,
  at: Date,
  feedbackText: string | null,
): TimelineEntry {
  const make = (
    kind: TimelineKind,
    label: string,
    detail: string | null = null,
  ): TimelineEntry => ({ at: at.toISOString(), kind, label, detail });

  switch (eventType) {
    case 'review_request_created':
      return make(
        'created',
        'Review request created',
        str(payload.via) ? `via ${String(payload.via)}` : null,
      );
    case 'email_sent':
      return make('sent', 'Email sent');
    case 'email_send_failed':
      return make('failed', 'Email send failed', str(payload.errorMessage));
    case 'email_delivered':
      return make('delivered', 'Email delivered');
    case 'email_opened':
      return make('opened', 'Email opened');
    case 'email_bounced':
      return make('bounced', 'Email bounced', str(payload.description) ?? str(payload.bounceType));
    case 'email_complained':
      return make('complained', 'Marked as spam');
    case 'redirected_to_google':
      return make('redirected', 'Clicked through to Google');
    case 'rating_submitted': {
      const rating = typeof payload.rating === 'number' ? payload.rating : null;
      const routedTo = str(payload.routedTo);
      return make(
        'rated',
        rating ? `Rated ${rating}★` : 'Rating submitted',
        routedTo ? `routed to ${routedTo}` : null,
      );
    }
    case 'feedback_submitted':
      return make('feedback', 'Private feedback submitted', feedbackText);
    default:
      return make('event', eventType.replace(/_/g, ' '));
  }
}

export function toRequestTimeline(row: RequestTimelineRow): RequestTimeline {
  const feedbackText = row.feedbackSubmission?.text ?? null;

  const fromEvents: TimelineEntry[] = row.events.map((e) =>
    eventToEntry(e.eventType, asRecord(e.payload), e.occurredAt, feedbackText),
  );

  // Step executions add only what the Event log can't represent: a step that is
  // scheduled (future send) or was skipped because its predicate didn't match.
  // Executed/failed sends are already covered by email_sent/email_send_failed.
  const fromSteps: TimelineEntry[] = row.stepExecutions
    .filter((s) => s.status === 'scheduled' || s.status === 'skipped')
    .map((s) => ({
      at: s.scheduledFor.toISOString(),
      kind: (s.status === 'scheduled' ? 'scheduled' : 'skipped') as TimelineKind,
      label: s.status === 'scheduled' ? 'Follow-up scheduled' : 'Step skipped',
      detail: s.campaignStep.stepType.replace(/_/g, ' '),
    }));

  const entries = [...fromEvents, ...fromSteps].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
  );

  return {
    id: row.id,
    customer: { name: row.customer.name, email: row.customer.email },
    campaignName: row.campaign.name,
    deliveryStatus: row.deliveryStatus,
    engagementStatus: row.engagementStatus,
    ratingStatus: row.ratingStatus,
    googleAttributionStatus: row.googleAttributionStatus,
    rating: row.ratingSubmission?.rating ?? null,
    createdAt: row.createdAt.toISOString(),
    entries,
  };
}
