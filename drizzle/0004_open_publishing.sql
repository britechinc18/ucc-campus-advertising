ALTER TABLE platform_settings DROP CONSTRAINT IF EXISTS auto_publish_disabled;
--> statement-breakpoint
ALTER TABLE platform_settings ALTER COLUMN auto_publish SET DEFAULT true;
--> statement-breakpoint
ALTER TABLE platform_settings ADD COLUMN posting_limits_enabled boolean NOT NULL DEFAULT false;
--> statement-breakpoint
UPDATE platform_settings SET auto_publish=true, posting_limits_enabled=false, version=version+1 WHERE id=1;
