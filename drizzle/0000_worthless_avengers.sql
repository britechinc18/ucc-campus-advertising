CREATE TABLE "accounts" (
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "advertisers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"suspended" boolean DEFAULT false NOT NULL,
	"trusted" boolean DEFAULT false NOT NULL,
	"consent_at" timestamp with time zone NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "advertisers_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "advertiser_kind" CHECK ("advertisers"."kind" in ('student','business'))
);
--> statement-breakpoint
CREATE TABLE "adverts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"advertiser_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"state" text DEFAULT 'draft' NOT NULL,
	"approved_revision_id" uuid,
	"published_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "advert_state" CHECK ("adverts"."state" in ('draft','pending','published','rejected','withdrawn','fulfilled','expired','suspended'))
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"target_id" uuid,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"advertiser_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"approved" jsonb,
	"pending" jsonb,
	"state" text DEFAULT 'pending' NOT NULL,
	"reason" text,
	CONSTRAINT "business_profiles_advertiser_id_unique" UNIQUE("advertiser_id"),
	CONSTRAINT "business_profiles_slug_unique" UNIQUE("slug"),
	CONSTRAINT "business_state" CHECK ("business_profiles"."state" in ('pending','approved','rejected','suspended'))
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "advertiser_daily_usage" (
	"advertiser_id" uuid NOT NULL,
	"day" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "advertiser_daily_usage_advertiser_id_day_pk" PRIMARY KEY("advertiser_id","day"),
	CONSTRAINT "usage_positive" CHECK ("advertiser_daily_usage"."count">=0)
);
--> statement-breakpoint
CREATE TABLE "featured_adverts" (
	"advert_id" uuid PRIMARY KEY NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	CONSTRAINT "feature_window" CHECK ("featured_adverts"."ends_at">"featured_adverts"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"advertiser_id" uuid NOT NULL,
	"key" uuid NOT NULL,
	"request_hash" text NOT NULL,
	"response" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "idempotency_keys_advertiser_id_key_pk" PRIMARY KEY("advertiser_id","key")
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"advertiser_id" uuid NOT NULL,
	"object_key" text NOT NULL,
	"state" text DEFAULT 'staged' NOT NULL,
	"bytes" integer,
	"checksum" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_assets_object_key_unique" UNIQUE("object_key"),
	CONSTRAINT "media_state" CHECK ("media_assets"."state" in ('staged','ready','deleting','deleted'))
);
--> statement-breakpoint
CREATE TABLE "daily_advert_metrics" (
	"advert_id" uuid NOT NULL,
	"day" text NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"contacts" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "daily_advert_metrics_advert_id_day_pk" PRIMARY KEY("advert_id","day")
);
--> statement-breakpoint
CREATE TABLE "rate_limit_buckets" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"advert_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"detail" text,
	"reporter_hash" text NOT NULL,
	"day" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"resolution" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_state" CHECK ("reports"."status" in ('open','resolved','dismissed'))
);
--> statement-breakpoint
CREATE TABLE "revision_media" (
	"revision_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "revision_media_revision_id_media_id_pk" PRIMARY KEY("revision_id","media_id")
);
--> statement-breakpoint
CREATE TABLE "advert_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"advert_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"purpose" text DEFAULT 'new' NOT NULL,
	"data" jsonb NOT NULL,
	"fingerprint" text NOT NULL,
	"submitted_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "revision_state" CHECK ("advert_revisions"."status" in ('draft','pending','approved','rejected','cancelled')),
	CONSTRAINT "revision_purpose" CHECK ("advert_revisions"."purpose" in ('new','edit','renew'))
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"max_active" integer DEFAULT 5 NOT NULL,
	"daily_limit" integer DEFAULT 3 NOT NULL,
	"duration_days" integer DEFAULT 30 NOT NULL,
	"max_images" integer DEFAULT 5 NOT NULL,
	"max_image_bytes" integer DEFAULT 5242880 NOT NULL,
	"auto_publish" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "singleton" CHECK ("platform_settings"."id"=1),
	CONSTRAINT "settings_bounds" CHECK ("platform_settings"."max_active" between 1 and 100 and "platform_settings"."daily_limit" between 1 and 100 and "platform_settings"."duration_days" between 1 and 365 and "platform_settings"."max_images" between 1 and 5 and "platform_settings"."max_image_bytes" between 1 and 5242880),
	CONSTRAINT "auto_publish_disabled" CHECK ("platform_settings"."auto_publish"=false)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"email" text,
	"email_verified" timestamp with time zone,
	"image" text,
	"role" text DEFAULT 'advertiser' NOT NULL,
	"suspended" boolean DEFAULT false NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "user_role" CHECK ("users"."role" in ('advertiser','admin'))
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advertisers" ADD CONSTRAINT "advertisers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advertisers" ADD CONSTRAINT "advertisers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adverts" ADD CONSTRAINT "adverts_advertiser_id_advertisers_id_fk" FOREIGN KEY ("advertiser_id") REFERENCES "public"."advertisers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adverts" ADD CONSTRAINT "adverts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_advertiser_id_advertisers_id_fk" FOREIGN KEY ("advertiser_id") REFERENCES "public"."advertisers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advertiser_daily_usage" ADD CONSTRAINT "advertiser_daily_usage_advertiser_id_advertisers_id_fk" FOREIGN KEY ("advertiser_id") REFERENCES "public"."advertisers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "featured_adverts" ADD CONSTRAINT "featured_adverts_advert_id_adverts_id_fk" FOREIGN KEY ("advert_id") REFERENCES "public"."adverts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_advertiser_id_advertisers_id_fk" FOREIGN KEY ("advertiser_id") REFERENCES "public"."advertisers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_advertiser_id_advertisers_id_fk" FOREIGN KEY ("advertiser_id") REFERENCES "public"."advertisers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_advert_metrics" ADD CONSTRAINT "daily_advert_metrics_advert_id_adverts_id_fk" FOREIGN KEY ("advert_id") REFERENCES "public"."adverts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_advert_id_adverts_id_fk" FOREIGN KEY ("advert_id") REFERENCES "public"."adverts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revision_media" ADD CONSTRAINT "revision_media_revision_id_advert_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."advert_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revision_media" ADD CONSTRAINT "revision_media_media_id_media_assets_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advert_revisions" ADD CONSTRAINT "advert_revisions_advert_id_adverts_id_fk" FOREIGN KEY ("advert_id") REFERENCES "public"."adverts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advert_revisions" ADD CONSTRAINT "advert_revisions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "advertiser_state" ON "adverts" USING btree ("advertiser_id","state");--> statement-breakpoint
CREATE INDEX "public_expiry" ON "adverts" USING btree ("state","expires_at","published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "report_dedup" ON "reports" USING btree ("advert_id","reporter_hash","day");--> statement-breakpoint
CREATE UNIQUE INDEX "media_position" ON "revision_media" USING btree ("revision_id","position");--> statement-breakpoint
CREATE INDEX "moderation_queue" ON "advert_revisions" USING btree ("status","submitted_at");--> statement-breakpoint
CREATE INDEX "duplicate_fingerprint" ON "advert_revisions" USING btree ("fingerprint");--> statement-breakpoint
CREATE UNIQUE INDEX "one_open_revision" ON "advert_revisions" USING btree ("advert_id") WHERE "advert_revisions"."status" in ('draft','pending');
--> statement-breakpoint
ALTER TABLE advert_revisions ADD CONSTRAINT revision_advert_identity UNIQUE (id, advert_id);
--> statement-breakpoint
ALTER TABLE adverts ADD CONSTRAINT approved_revision_owner FOREIGN KEY (approved_revision_id,id) REFERENCES advert_revisions(id,advert_id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
CREATE INDEX revision_public_search ON advert_revisions USING gin (to_tsvector('simple', coalesce(data->>'title','') || ' ' || coalesce(data->>'description','')));
--> statement-breakpoint
INSERT INTO platform_settings (id) VALUES (1);
--> statement-breakpoint
INSERT INTO categories (name,slug) VALUES ('Books and study materials','books'),('Electronics','electronics'),('Clothing','clothing'),('Accommodation','accommodation'),('Food','food'),('Services','services'),('Wanted','wanted');
