/**
 * CampaignStep.requiredState evaluation — the contract between the campaign
 * editor (which writes the predicate JSON) and the scheduler/mailer (which
 * evaluate it). Shared so the "is this follow-up still warranted?" logic has
 * exactly one definition across api + worker.
 */

import type {
  DeliveryStatus,
  EngagementStatus,
  GoogleAttributionStatus,
  RatingStatus,
} from './enums';

/** The four status tracks a requiredState predicate may key off. */
export interface RequestStatusSnapshot {
  deliveryStatus: DeliveryStatus;
  engagementStatus: EngagementStatus;
  ratingStatus: RatingStatus;
  googleAttributionStatus: GoogleAttributionStatus;
}

const PREDICATE_KEYS: (keyof RequestStatusSnapshot)[] = [
  'deliveryStatus',
  'engagementStatus',
  'ratingStatus',
  'googleAttributionStatus',
  
];

/**
 * True iff every key in `requiredState` equals the request's current value.
 * Fail-closed: an unknown predicate key returns false (treat a misconfigured
 * step as "don't send" rather than sending unconditionally). An empty
 * predicate ({}) matches everything — that's the initial step.
 */
export function matchesRequiredState(
  status: RequestStatusSnapshot,
  requiredState: Record<string, unknown> | null | undefined,
): boolean {
  if (!requiredState) return true;
  for (const [key, expected] of Object.entries(requiredState)) {
    if (!PREDICATE_KEYS.includes(key as keyof RequestStatusSnapshot)) {
      return false;
    }
    if (status[key as keyof RequestStatusSnapshot] !== expected) {
      return false;
    }
  }
  return true;
}
