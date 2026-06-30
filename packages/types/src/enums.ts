/**
 * Status/category enum vocabularies — the cross-app contract (web + api +
 * worker import from here; never re-declare these unions in an app). Mirrors
 * the Prisma enums in packages/db/prisma/schema.prisma 1:1; the two are kept in
 * sync by hand (the DB is the storage source of truth, this is the wire/app
 * source). Each group ships a readonly tuple (for `@IsIn(...)` validation and
 * runtime iteration) plus its derived union type.
 */

export const ROLES = ['admin', 'member'] as const;
export type Role = (typeof ROLES)[number];

export const INVITATION_STATUSES = [
  'pending',
  'accepted',
  'revoked',
  'expired',
] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

export const EMAIL_STATUSES = [
  'valid',
  'invalid',
  'unsubscribed',
  'complained',
] as const;
export type EmailStatus = (typeof EMAIL_STATUSES)[number];

export const IMPORT_SOURCES = ['csv', 'manual', 'api'] as const;
export type ImportSource = (typeof IMPORT_SOURCES)[number];

export const CAMPAIGN_STEP_TYPES = [
  'initial',
  'follow_up_no_rating',
  'follow_up_no_google_review',
] as const;
export type CampaignStepType = (typeof CAMPAIGN_STEP_TYPES)[number];

export const CAMPAIGN_DELAY_ANCHORS = [
  'request_created',
  'previous_step',
  'rating_submitted',
] as const;
export type CampaignDelayAnchor = (typeof CAMPAIGN_DELAY_ANCHORS)[number];

export const DELIVERY_STATUSES = [
  'pending',
  'sent',
  'delivered',
  'bounced',
  'complained',
  'failed',
] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const ENGAGEMENT_STATUSES = [
  'not_opened',
  'opened',
  'link_clicked',
  'landing_viewed',
] as const;
export type EngagementStatus = (typeof ENGAGEMENT_STATUSES)[number];

export const RATING_STATUSES = [
  'not_rated',
  'rated_positive',
  'rated_negative',
  'feedback_submitted',
] as const;
export type RatingStatus = (typeof RATING_STATUSES)[number];

export const GOOGLE_ATTRIBUTION_STATUSES = [
  'not_applicable',
  'pending_check',
  'confirmed_posted',
  'posted_low_confidence',
  'not_posted',
] as const;
export type GoogleAttributionStatus =
  (typeof GOOGLE_ATTRIBUTION_STATUSES)[number];

export const STEP_EXECUTION_STATUSES = [
  'scheduled',
  'executed',
  'skipped',
  'failed',
] as const;
export type StepExecutionStatus = (typeof STEP_EXECUTION_STATUSES)[number];

export const ROUTED_TO = ['google', 'feedback'] as const;
export type RoutedTo = (typeof ROUTED_TO)[number];

export const ATTRIBUTION_CONFIDENCES = ['high', 'medium', 'low'] as const;
export type AttributionConfidence = (typeof ATTRIBUTION_CONFIDENCES)[number];

export const SYNC_STATUSES = ['running', 'completed', 'failed'] as const;
export type SyncStatus = (typeof SYNC_STATUSES)[number];

export const SYNC_TYPES = [
  'baseline',
  'incremental',
  'full',
  'targeted',
] as const;
export type SyncType = (typeof SYNC_TYPES)[number];

export const SYNC_TRIGGERS = [
  'cron',
  'on_demand',
  'request_completed',
] as const;
export type SyncTrigger = (typeof SYNC_TRIGGERS)[number];

export const NOTIFICATION_CHANNELS = [
  'email',
  'in_app',
  'whatsapp',
  'slack',
] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const SENDER_PROVIDERS = ['shared', 'postmark_domain'] as const;
export type SenderProvider = (typeof SENDER_PROVIDERS)[number];
