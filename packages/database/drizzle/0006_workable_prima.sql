ALTER TABLE "tasks" DROP CONSTRAINT "tasks_parent_id_tasks_id_fk";
--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "estimated_duration" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "search_vector" "tsvector";--> statement-breakpoint
CREATE INDEX "projects_workspace_id_name_idx" ON "projects" USING btree ("workspace_id","name");--> statement-breakpoint
CREATE INDEX "tasks_workspace_id_project_id_idx" ON "tasks" USING btree ("workspace_id","project_id");--> statement-breakpoint
CREATE INDEX "tasks_workspace_id_status_idx" ON "tasks" USING btree ("workspace_id","status");