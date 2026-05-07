-- CreateTable
CREATE TABLE "businesses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clerk_organization_id" TEXT NOT NULL,
    "from_email_domain" TEXT,
    "postmark_server_token" TEXT,
    "postmark_message_stream" TEXT,
    "google_place_id" TEXT,
    "google_review_url" TEXT,
    "positive_rating_threshold" INTEGER NOT NULL DEFAULT 4,
    "customer_cooldown_days" INTEGER NOT NULL DEFAULT 90,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location_users" (
    "id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "clerk_user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "location_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "has_attributed_google_review" BOOLEAN NOT NULL DEFAULT false,
    "last_review_request_sent_at" TIMESTAMP(3),
    "email_status" TEXT NOT NULL DEFAULT 'valid',
    "import_source" TEXT NOT NULL DEFAULT 'manual',
    "imported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_steps" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "step_order" INTEGER NOT NULL,
    "step_type" TEXT NOT NULL,
    "delay_days" INTEGER NOT NULL,
    "delay_anchor" TEXT NOT NULL,
    "required_state" JSONB NOT NULL,
    "subject_template" TEXT NOT NULL,
    "body_template" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_requests" (
    "id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "sent_by_user_id" TEXT,
    "public_token" TEXT NOT NULL,
    "delivery_status" TEXT NOT NULL DEFAULT 'pending',
    "engagement_status" TEXT NOT NULL DEFAULT 'not_opened',
    "rating_status" TEXT NOT NULL DEFAULT 'not_rated',
    "google_attribution_status" TEXT NOT NULL DEFAULT 'not_applicable',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "review_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_request_step_executions" (
    "id" TEXT NOT NULL,
    "review_request_id" TEXT NOT NULL,
    "campaign_step_id" TEXT NOT NULL,
    "scheduled_for" TIMESTAMP(3) NOT NULL,
    "executed_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "postmark_message_id" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_request_step_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rating_submissions" (
    "id" TEXT NOT NULL,
    "review_request_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "routed_to" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "user_agent" TEXT,

    CONSTRAINT "rating_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_submissions" (
    "id" TEXT NOT NULL,
    "review_request_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "review_request_id" TEXT,
    "location_id" TEXT,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "google_review_snapshots" (
    "id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "synced_at" TIMESTAMP(3) NOT NULL,
    "total_count" INTEGER NOT NULL,
    "average_rating" DOUBLE PRECISION NOT NULL,
    "distribution" JSONB NOT NULL,
    "is_baseline" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "google_review_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "google_reviews" (
    "id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "reviewer_name" TEXT NOT NULL,
    "reviewer_avatar_url" TEXT,
    "rating" INTEGER NOT NULL,
    "text" TEXT,
    "language" TEXT,
    "posted_at" TIMESTAMP(3) NOT NULL,
    "first_seen_in_sync_id" TEXT NOT NULL,
    "removed_at" TIMESTAMP(3),
    "attributed_review_request_id" TEXT,
    "attribution_confidence" TEXT,
    "attribution_confirmed_manually" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_syncs" (
    "id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'running',
    "sync_type" TEXT NOT NULL,
    "triggered_by" TEXT NOT NULL,
    "reviews_added" INTEGER NOT NULL DEFAULT 0,
    "reviews_removed" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,

    CONSTRAINT "review_syncs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_rules" (
    "id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "recipients" JSONB NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "locations_clerk_organization_id_key" ON "locations"("clerk_organization_id");

-- CreateIndex
CREATE INDEX "locations_business_id_idx" ON "locations"("business_id");

-- CreateIndex
CREATE INDEX "location_users_clerk_user_id_idx" ON "location_users"("clerk_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "location_users_location_id_clerk_user_id_key" ON "location_users"("location_id", "clerk_user_id");

-- CreateIndex
CREATE INDEX "customers_location_id_name_idx" ON "customers"("location_id", "name");

-- CreateIndex
CREATE INDEX "customers_location_id_email_status_idx" ON "customers"("location_id", "email_status");

-- CreateIndex
CREATE UNIQUE INDEX "customers_location_id_email_key" ON "customers"("location_id", "email");

-- CreateIndex
CREATE INDEX "campaigns_location_id_is_active_idx" ON "campaigns"("location_id", "is_active");

-- CreateIndex
CREATE INDEX "campaign_steps_campaign_id_idx" ON "campaign_steps"("campaign_id");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_steps_campaign_id_step_order_key" ON "campaign_steps"("campaign_id", "step_order");

-- CreateIndex
CREATE UNIQUE INDEX "review_requests_public_token_key" ON "review_requests"("public_token");

-- CreateIndex
CREATE INDEX "review_requests_location_id_delivery_status_idx" ON "review_requests"("location_id", "delivery_status");

-- CreateIndex
CREATE INDEX "review_requests_location_id_rating_status_idx" ON "review_requests"("location_id", "rating_status");

-- CreateIndex
CREATE INDEX "review_requests_location_id_google_attribution_status_idx" ON "review_requests"("location_id", "google_attribution_status");

-- CreateIndex
CREATE INDEX "review_requests_customer_id_idx" ON "review_requests"("customer_id");

-- CreateIndex
CREATE INDEX "review_requests_campaign_id_idx" ON "review_requests"("campaign_id");

-- CreateIndex
CREATE INDEX "review_request_step_executions_scheduled_for_status_idx" ON "review_request_step_executions"("scheduled_for", "status");

-- CreateIndex
CREATE INDEX "review_request_step_executions_status_idx" ON "review_request_step_executions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "review_request_step_executions_review_request_id_campaign_s_key" ON "review_request_step_executions"("review_request_id", "campaign_step_id");

-- CreateIndex
CREATE UNIQUE INDEX "rating_submissions_review_request_id_key" ON "rating_submissions"("review_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "feedback_submissions_review_request_id_key" ON "feedback_submissions"("review_request_id");

-- CreateIndex
CREATE INDEX "events_review_request_id_occurred_at_idx" ON "events"("review_request_id", "occurred_at");

-- CreateIndex
CREATE INDEX "events_location_id_event_type_occurred_at_idx" ON "events"("location_id", "event_type", "occurred_at");

-- CreateIndex
CREATE INDEX "events_event_type_occurred_at_idx" ON "events"("event_type", "occurred_at");

-- CreateIndex
CREATE INDEX "google_review_snapshots_location_id_synced_at_idx" ON "google_review_snapshots"("location_id", "synced_at");

-- CreateIndex
CREATE INDEX "google_review_snapshots_location_id_is_baseline_idx" ON "google_review_snapshots"("location_id", "is_baseline");

-- CreateIndex
CREATE UNIQUE INDEX "google_reviews_attributed_review_request_id_key" ON "google_reviews"("attributed_review_request_id");

-- CreateIndex
CREATE INDEX "google_reviews_location_id_posted_at_idx" ON "google_reviews"("location_id", "posted_at");

-- CreateIndex
CREATE INDEX "google_reviews_location_id_removed_at_idx" ON "google_reviews"("location_id", "removed_at");

-- CreateIndex
CREATE INDEX "google_reviews_reviewer_name_idx" ON "google_reviews"("reviewer_name");

-- CreateIndex
CREATE UNIQUE INDEX "google_reviews_location_id_external_id_key" ON "google_reviews"("location_id", "external_id");

-- CreateIndex
CREATE INDEX "review_syncs_location_id_started_at_idx" ON "review_syncs"("location_id", "started_at");

-- CreateIndex
CREATE INDEX "review_syncs_location_id_sync_type_started_at_idx" ON "review_syncs"("location_id", "sync_type", "started_at");

-- CreateIndex
CREATE INDEX "notification_rules_location_id_is_enabled_idx" ON "notification_rules"("location_id", "is_enabled");

-- CreateIndex
CREATE UNIQUE INDEX "notification_rules_location_id_event_type_channel_key" ON "notification_rules"("location_id", "event_type", "channel");

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_users" ADD CONSTRAINT "location_users_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_steps" ADD CONSTRAINT "campaign_steps_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_requests" ADD CONSTRAINT "review_requests_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_requests" ADD CONSTRAINT "review_requests_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_requests" ADD CONSTRAINT "review_requests_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_requests" ADD CONSTRAINT "review_requests_sent_by_user_id_fkey" FOREIGN KEY ("sent_by_user_id") REFERENCES "location_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_request_step_executions" ADD CONSTRAINT "review_request_step_executions_review_request_id_fkey" FOREIGN KEY ("review_request_id") REFERENCES "review_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_request_step_executions" ADD CONSTRAINT "review_request_step_executions_campaign_step_id_fkey" FOREIGN KEY ("campaign_step_id") REFERENCES "campaign_steps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rating_submissions" ADD CONSTRAINT "rating_submissions_review_request_id_fkey" FOREIGN KEY ("review_request_id") REFERENCES "review_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_submissions" ADD CONSTRAINT "feedback_submissions_review_request_id_fkey" FOREIGN KEY ("review_request_id") REFERENCES "review_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_review_request_id_fkey" FOREIGN KEY ("review_request_id") REFERENCES "review_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_review_snapshots" ADD CONSTRAINT "google_review_snapshots_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_reviews" ADD CONSTRAINT "google_reviews_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_reviews" ADD CONSTRAINT "google_reviews_first_seen_in_sync_id_fkey" FOREIGN KEY ("first_seen_in_sync_id") REFERENCES "review_syncs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_reviews" ADD CONSTRAINT "google_reviews_attributed_review_request_id_fkey" FOREIGN KEY ("attributed_review_request_id") REFERENCES "review_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_syncs" ADD CONSTRAINT "review_syncs_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_rules" ADD CONSTRAINT "notification_rules_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
