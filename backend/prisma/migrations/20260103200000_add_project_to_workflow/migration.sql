-- Add project_id column to workflows table
-- This migration scopes workflows to projects for multi-tenancy

-- Step 1: Add nullable project_id column
ALTER TABLE "workflows" ADD COLUMN "project_id" TEXT;

-- Step 2: Create index for project_id
CREATE INDEX "workflows_project_id_idx" ON "workflows"("project_id");

-- Step 3: For existing workflows, we'll assign them to a default project
-- This will be handled by the application during startup if needed

-- Step 4: Add unique constraint for project_id + name
CREATE UNIQUE INDEX "workflows_project_id_name_key" ON "workflows"("project_id", "name");
