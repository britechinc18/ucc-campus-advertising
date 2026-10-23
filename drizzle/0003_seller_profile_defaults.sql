DROP INDEX "advertisers_user_kind_unique";--> statement-breakpoint
ALTER TABLE "advertisers" ADD COLUMN "closed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "advertisers" ADD COLUMN "deactivated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "advertisers" ADD COLUMN "reactivation_pending" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "advertisers" ADD COLUMN "automatic_personal" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "advertisers" ADD COLUMN "draft_defaults" jsonb;--> statement-breakpoint
ALTER TABLE "advertisers" ADD COLUMN "approved_defaults" jsonb;--> statement-breakpoint
ALTER TABLE "advertisers" ADD COLUMN "defaults_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "advertisers" ADD COLUMN "approved_defaults_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "advertisers" ADD COLUMN "profile_state" text DEFAULT 'incomplete' NOT NULL;--> statement-breakpoint
ALTER TABLE "advertisers" ADD COLUMN "profile_reason" text;--> statement-breakpoint
ALTER TABLE "advertisers" ADD COLUMN "privacy" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "adverts" ADD COLUMN "privacy_hidden" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "advertisers_user_kind_unique" ON "advertisers" USING btree ("user_id","kind") WHERE "advertisers"."closed_at" is null;--> statement-breakpoint
-- Preserve legacy identity snapshots; existing adverts do not gain implicit profile links.
UPDATE advert_revisions r SET data = r.data || jsonb_build_object('displayName',coalesce(b.approved->>'name',p.name))
FROM adverts a JOIN advertisers p ON p.id=a.advertiser_id LEFT JOIN business_profiles b ON b.advertiser_id=p.id
WHERE r.advert_id=a.id AND NOT (r.data ? 'displayName');
--> statement-breakpoint
-- Only existing sellers are backfilled, never browsing-only accounts. No email is made public.
INSERT INTO advertisers(user_id,name,kind,consent_at,created_by,automatic_personal)
SELECT u.id,coalesce(nullif(u.name,''),'Personal seller'),'student',now(),u.id,true FROM users u
WHERE EXISTS(SELECT 1 FROM advertisers p WHERE p.user_id=u.id AND p.closed_at IS NULL)
AND NOT EXISTS(SELECT 1 FROM advertisers p WHERE p.user_id=u.id AND p.kind='student' AND p.closed_at IS NULL);
--> statement-breakpoint
CREATE FUNCTION medstash_effective_content(content jsonb, defaults jsonb, approved_version integer, privacy jsonb)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE result jsonb := content; field text; key text; value jsonb; links jsonb := coalesce(content->'contactSources','[]'::jsonb);
BEGIN
  FOREACH field IN ARRAY ARRAY['displayName','phone','whatsapp','location','tiktok','snapchat','instagram','x'] LOOP
    IF links ? field THEN
      IF defaults IS NOT NULL AND approved_version >= coalesce((content->>'profileVersion')::integer,0) THEN
        key := CASE WHEN field='displayName' THEN 'name' ELSE field END;
        value := CASE WHEN field IN ('tiktok','snapchat','instagram','x') THEN defaults->'socials'->field ELSE defaults->key END;
        IF field IN ('tiktok','snapchat','instagram','x') THEN
          result := jsonb_set(result,'{socials}',coalesce(result->'socials','{}'::jsonb) - field);
          IF value IS NOT NULL THEN result := jsonb_set(result,ARRAY['socials',field],value); END IF;
        ELSIF value IS NOT NULL THEN result := jsonb_set(result,ARRAY[field],value);
        ELSIF field IN ('phone','whatsapp') THEN result := result - field;
        END IF;
      END IF;
      IF privacy->>field='false' OR defaults->'visibility'->>field='false' THEN
        IF field IN ('tiktok','snapchat','instagram','x') THEN result := jsonb_set(result,'{socials}',coalesce(result->'socials','{}'::jsonb) - field);
        ELSE result := result - field; END IF;
      END IF;
    END IF;
  END LOOP;
  RETURN result;
END $$;
