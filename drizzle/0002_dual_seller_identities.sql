ALTER TABLE "advertisers" DROP CONSTRAINT "advertisers_user_id_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "advertisers_user_kind_unique" ON "advertisers" USING btree ("user_id","kind");