-- Add self-referencing foreign key constraints for tasks and task_comments
-- These constraints couldn't be defined inline due to TypeScript/Drizzle limitations

-- Add foreign key constraint for tasks.parent_id (self-referencing for subtasks)
ALTER TABLE "tasks" 
ADD CONSTRAINT "tasks_parent_id_fkey" 
FOREIGN KEY ("parent_id") REFERENCES "tasks"("id") ON DELETE CASCADE;

-- Add foreign key constraint for task_comments.parent_id (self-referencing for threaded replies)
ALTER TABLE "task_comments" 
ADD CONSTRAINT "task_comments_parent_id_fkey" 
FOREIGN KEY ("parent_id") REFERENCES "task_comments"("id") ON DELETE CASCADE;
