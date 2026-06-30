-- Convert status/category string columns to Postgres enums.
--
-- Hand-written (NOT the prisma migrate diff default): the generated diff used
-- DROP COLUMN + ADD COLUMN, which would have wiped every existing value (and
-- failed on the NOT-NULL-no-default columns that already have rows). Instead we
-- ALTER COLUMN ... TYPE ... USING (col::text::"Enum"), which preserves data and
-- lets Postgres auto-rebuild the dependent indexes. Enum labels were chosen to
-- match the legacy string values 1:1, so every cast succeeds with no backfill
-- (verified via SELECT DISTINCT before writing this).

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'member');
CREATE TYPE "InvitationStatus" AS ENUM ('pending', 'accepted', 'revoked', 'expired');
CREATE TYPE "EmailStatus" AS ENUM ('valid', 'invalid', 'unsubscribed', 'complained');
CREATE TYPE "ImportSource" AS ENUM ('csv', 'manual', 'api');
CREATE TYPE "StepType" AS ENUM ('initial', 'follow_up_no_rating', 'follow_up_no_google_review');
CREATE TYPE "DelayAnchor" AS ENUM ('request_created', 'previous_step', 'rating_submitted');
CREATE TYPE "DeliveryStatus" AS ENUM ('pending', 'sent', 'delivered', 'bounced', 'complained', 'failed');
CREATE TYPE "EngagementStatus" AS ENUM ('not_opened', 'opened', 'link_clicked', 'landing_viewed');
CREATE TYPE "RatingStatus" AS ENUM ('not_rated', 'rated_positive', 'rated_negative', 'feedback_submitted');
CREATE TYPE "GoogleAttributionStatus" AS ENUM ('not_applicable', 'pending_check', 'confirmed_posted', 'posted_low_confidence', 'not_posted');
CREATE TYPE "StepExecutionStatus" AS ENUM ('scheduled', 'executed', 'skipped', 'failed');
CREATE TYPE "RoutedTo" AS ENUM ('google', 'feedback');
CREATE TYPE "AttributionConfidence" AS ENUM ('high', 'medium', 'low');
CREATE TYPE "SyncStatus" AS ENUM ('running', 'completed', 'failed');
CREATE TYPE "SyncType" AS ENUM ('baseline', 'incremental', 'full', 'targeted');
CREATE TYPE "SyncTrigger" AS ENUM ('cron', 'on_demand', 'request_completed');
CREATE TYPE "NotificationChannel" AS ENUM ('email', 'in_app', 'whatsapp', 'slack');

-- location_users.role (no default)
ALTER TABLE "location_users"
  ALTER COLUMN "role" TYPE "Role" USING ("role"::text::"Role");

-- invitations.role (no default), invitations.status (default 'pending')
ALTER TABLE "invitations"
  ALTER COLUMN "role" TYPE "Role" USING ("role"::text::"Role"),
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "InvitationStatus" USING ("status"::text::"InvitationStatus"),
  ALTER COLUMN "status" SET DEFAULT 'pending';

-- customers.email_status (default 'valid'), customers.import_source (default 'manual')
ALTER TABLE "customers"
  ALTER COLUMN "email_status" DROP DEFAULT,
  ALTER COLUMN "email_status" TYPE "EmailStatus" USING ("email_status"::text::"EmailStatus"),
  ALTER COLUMN "email_status" SET DEFAULT 'valid',
  ALTER COLUMN "import_source" DROP DEFAULT,
  ALTER COLUMN "import_source" TYPE "ImportSource" USING ("import_source"::text::"ImportSource"),
  ALTER COLUMN "import_source" SET DEFAULT 'manual';

-- campaign_steps.step_type (no default), campaign_steps.delay_anchor (no default)
ALTER TABLE "campaign_steps"
  ALTER COLUMN "step_type" TYPE "StepType" USING ("step_type"::text::"StepType"),
  ALTER COLUMN "delay_anchor" TYPE "DelayAnchor" USING ("delay_anchor"::text::"DelayAnchor");

-- review_requests: four status tracks, each with a default
ALTER TABLE "review_requests"
  ALTER COLUMN "delivery_status" DROP DEFAULT,
  ALTER COLUMN "delivery_status" TYPE "DeliveryStatus" USING ("delivery_status"::text::"DeliveryStatus"),
  ALTER COLUMN "delivery_status" SET DEFAULT 'pending',
  ALTER COLUMN "engagement_status" DROP DEFAULT,
  ALTER COLUMN "engagement_status" TYPE "EngagementStatus" USING ("engagement_status"::text::"EngagementStatus"),
  ALTER COLUMN "engagement_status" SET DEFAULT 'not_opened',
  ALTER COLUMN "rating_status" DROP DEFAULT,
  ALTER COLUMN "rating_status" TYPE "RatingStatus" USING ("rating_status"::text::"RatingStatus"),
  ALTER COLUMN "rating_status" SET DEFAULT 'not_rated',
  ALTER COLUMN "google_attribution_status" DROP DEFAULT,
  ALTER COLUMN "google_attribution_status" TYPE "GoogleAttributionStatus" USING ("google_attribution_status"::text::"GoogleAttributionStatus"),
  ALTER COLUMN "google_attribution_status" SET DEFAULT 'not_applicable';

-- review_request_step_executions.status (default 'scheduled')
ALTER TABLE "review_request_step_executions"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "StepExecutionStatus" USING ("status"::text::"StepExecutionStatus"),
  ALTER COLUMN "status" SET DEFAULT 'scheduled';

-- rating_submissions.routed_to (no default)
ALTER TABLE "rating_submissions"
  ALTER COLUMN "routed_to" TYPE "RoutedTo" USING ("routed_to"::text::"RoutedTo");

-- google_reviews.attribution_confidence (nullable, no default)
ALTER TABLE "google_reviews"
  ALTER COLUMN "attribution_confidence" TYPE "AttributionConfidence" USING ("attribution_confidence"::text::"AttributionConfidence");

-- review_syncs.status (default 'running'), sync_type (no default), triggered_by (no default)
ALTER TABLE "review_syncs"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "SyncStatus" USING ("status"::text::"SyncStatus"),
  ALTER COLUMN "status" SET DEFAULT 'running',
  ALTER COLUMN "sync_type" TYPE "SyncType" USING ("sync_type"::text::"SyncType"),
  ALTER COLUMN "triggered_by" TYPE "SyncTrigger" USING ("triggered_by"::text::"SyncTrigger");

-- notification_rules.channel (no default)
ALTER TABLE "notification_rules"
  ALTER COLUMN "channel" TYPE "NotificationChannel" USING ("channel"::text::"NotificationChannel");
