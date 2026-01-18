/*
  Warnings:

  - You are about to drop the `project_members` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `user_id` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `project_id` on the `scheduled_tests` table. All the data in the column will be lost.
  - You are about to drop the column `project_id` on the `test_data_sheets` table. All the data in the column will be lost.
  - You are about to drop the column `project_id` on the `workflows` table. All the data in the column will be lost.
  - Added the required column `application_id` to the `projects` table without a default value. This is not possible if the table is not empty.
  - Added the required column `application_id` to the `scheduled_tests` table without a default value. This is not possible if the table is not empty.
  - Added the required column `application_id` to the `test_data_sheets` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "project_members_project_id_user_id_key";

-- DropIndex
DROP INDEX "project_members_user_id_idx";

-- DropIndex
DROP INDEX "project_members_project_id_idx";

-- AlterTable
ALTER TABLE "execution_steps" ADD COLUMN "steps_json" TEXT;

-- AlterTable
ALTER TABLE "schedule_runs" ADD COLUMN "execution_config" TEXT;
ALTER TABLE "schedule_runs" ADD COLUMN "github_run_id" BIGINT;
ALTER TABLE "schedule_runs" ADD COLUMN "github_run_url" TEXT;
ALTER TABLE "schedule_runs" ADD COLUMN "parameter_values" TEXT;
ALTER TABLE "schedule_runs" ADD COLUMN "triggered_by_user" TEXT;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "project_members";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "application_members" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "application_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "application_members_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "application_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "recording_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "test_flow_id" TEXT,
    "user_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "start_url" TEXT NOT NULL,
    "scenario_name" TEXT,
    "page_name" TEXT,
    "vero_code" TEXT,
    "error_message" TEXT,
    "browser_pid" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "completed_at" DATETIME
);

-- CreateTable
CREATE TABLE "recording_steps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "session_id" TEXT NOT NULL,
    "step_number" INTEGER NOT NULL,
    "action_type" TEXT NOT NULL,
    "vero_code" TEXT NOT NULL,
    "primary_selector" TEXT NOT NULL,
    "selector_type" TEXT NOT NULL,
    "fallback_selectors" TEXT NOT NULL DEFAULT '[]',
    "confidence" REAL NOT NULL DEFAULT 0.0,
    "is_stable" BOOLEAN NOT NULL DEFAULT true,
    "value" TEXT,
    "url" TEXT NOT NULL,
    "page_name" TEXT,
    "field_name" TEXT,
    "screenshot_path" TEXT,
    "element_tag" TEXT,
    "element_text" TEXT,
    "bounding_box" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "recording_steps_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "recording_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "app_environments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "application_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "app_environments_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "app_env_variables" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "environment_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "is_secret" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "app_env_variables_environment_id_fkey" FOREIGN KEY ("environment_id") REFERENCES "app_environments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "data_storage_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "application_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'sqlite',
    "connection_string" TEXT,
    "host" TEXT,
    "port" INTEGER,
    "database" TEXT,
    "username" TEXT,
    "password" TEXT,
    "use_ssl" BOOLEAN NOT NULL DEFAULT true,
    "options" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_tested_at" DATETIME,
    "last_error" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "data_storage_configs_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "test_data_saved_views" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sheet_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "filter_state" TEXT NOT NULL DEFAULT '{}',
    "sort_state" TEXT NOT NULL DEFAULT '[]',
    "column_state" TEXT NOT NULL DEFAULT '[]',
    "group_state" TEXT NOT NULL DEFAULT '[]',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "test_data_saved_views_sheet_id_fkey" FOREIGN KEY ("sheet_id") REFERENCES "test_data_sheets" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "test_data_relationships" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source_sheet_id" TEXT NOT NULL,
    "target_sheet_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "source_column" TEXT NOT NULL,
    "target_column" TEXT NOT NULL,
    "display_columns" TEXT NOT NULL DEFAULT '[]',
    "relationship_type" TEXT NOT NULL DEFAULT 'many-to-one',
    "cascade_delete" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "test_data_relationships_source_sheet_id_fkey" FOREIGN KEY ("source_sheet_id") REFERENCES "test_data_sheets" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "test_data_relationships_target_sheet_id_fkey" FOREIGN KEY ("target_sheet_id") REFERENCES "test_data_sheets" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "execution_environments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflow_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "base_url" TEXT NOT NULL,
    "description" TEXT,
    "variables" TEXT NOT NULL DEFAULT '{}',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "remote_runners" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflow_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 22,
    "auth_type" TEXT NOT NULL DEFAULT 'ssh-key',
    "credential_id" TEXT,
    "docker_image" TEXT,
    "max_workers" INTEGER NOT NULL DEFAULT 4,
    "is_healthy" BOOLEAN NOT NULL DEFAULT true,
    "last_ping_at" DATETIME,
    "error_message" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "run_configurations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflow_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "tag_mode" TEXT NOT NULL DEFAULT 'any',
    "exclude_tags" TEXT NOT NULL DEFAULT '[]',
    "test_flow_ids" TEXT NOT NULL DEFAULT '[]',
    "grep" TEXT,
    "environment_id" TEXT,
    "target" TEXT NOT NULL DEFAULT 'local',
    "local_config" TEXT,
    "docker_config" TEXT,
    "github_actions_config" TEXT,
    "remote_runner_id" TEXT,
    "browser" TEXT NOT NULL DEFAULT 'chromium',
    "browser_channel" TEXT,
    "headless" BOOLEAN NOT NULL DEFAULT true,
    "viewport" TEXT NOT NULL DEFAULT '{"width":1280,"height":720}',
    "workers" INTEGER NOT NULL DEFAULT 1,
    "shard_count" INTEGER NOT NULL DEFAULT 1,
    "retries" INTEGER NOT NULL DEFAULT 0,
    "timeout" INTEGER NOT NULL DEFAULT 30000,
    "tracing" TEXT NOT NULL DEFAULT 'on-failure',
    "screenshot" TEXT NOT NULL DEFAULT 'on-failure',
    "video" TEXT NOT NULL DEFAULT 'off',
    "advanced_config" TEXT DEFAULT '{}',
    "github_repository" TEXT,
    "github_workflow_path" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "run_configurations_environment_id_fkey" FOREIGN KEY ("environment_id") REFERENCES "execution_environments" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "run_configurations_remote_runner_id_fkey" FOREIGN KEY ("remote_runner_id") REFERENCES "remote_runners" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "stored_credentials" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflow_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "encrypted_value" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changes" TEXT,
    "metadata" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "notification_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schedule_id" TEXT,
    "run_id" TEXT,
    "type" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "sent_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "github_integrations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "token_type" TEXT NOT NULL DEFAULT 'pat',
    "scope" TEXT NOT NULL DEFAULT 'repo,workflow',
    "login" TEXT NOT NULL,
    "avatar_url" TEXT,
    "is_valid" BOOLEAN NOT NULL DEFAULT true,
    "last_validated_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "github_repository_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "integration_id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "repo_full_name" TEXT NOT NULL,
    "repo_id" INTEGER NOT NULL,
    "default_branch" TEXT NOT NULL DEFAULT 'main',
    "workflow_path" TEXT NOT NULL DEFAULT '.github/workflows/vero-tests.yml',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_synced_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "github_repository_configs_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "github_integrations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "github_workflow_runs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflow_id" TEXT NOT NULL,
    "execution_id" TEXT,
    "run_id" BIGINT NOT NULL,
    "run_number" INTEGER NOT NULL,
    "repo_full_name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "conclusion" TEXT,
    "html_url" TEXT NOT NULL,
    "event" TEXT NOT NULL DEFAULT 'workflow_dispatch',
    "head_branch" TEXT,
    "head_sha" TEXT,
    "config_snapshot" TEXT,
    "artifacts_url" TEXT,
    "logs_url" TEXT,
    "started_at" DATETIME,
    "completed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "github_workflow_jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "run_db_id" TEXT NOT NULL,
    "job_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "conclusion" TEXT,
    "html_url" TEXT,
    "runner_name" TEXT,
    "started_at" DATETIME,
    "completed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "github_workflow_jobs_run_db_id_fkey" FOREIGN KEY ("run_db_id") REFERENCES "github_workflow_runs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "copilot_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'idle',
    "conversation_json" TEXT NOT NULL DEFAULT '[]',
    "reflection_count" INTEGER NOT NULL DEFAULT 0,
    "max_reflections" INTEGER NOT NULL DEFAULT 5,
    "current_task_json" TEXT,
    "error_message" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "completed_at" DATETIME
);

-- CreateTable
CREATE TABLE "copilot_staged_changes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "session_id" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "original_content" TEXT,
    "new_content" TEXT NOT NULL,
    "change_type" TEXT NOT NULL,
    "diff_json" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reasoning_json" TEXT,
    "user_feedback" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "copilot_staged_changes_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "copilot_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "copilot_explorations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "session_id" TEXT NOT NULL,
    "target_url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "results_json" TEXT,
    "screenshots_json" TEXT,
    "error_message" TEXT,
    "stagehand_log_json" TEXT,
    "started_at" DATETIME,
    "completed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "copilot_explorations_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "copilot_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "copilot_learned_selectors" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "element_description" TEXT NOT NULL,
    "primary_selector" TEXT NOT NULL,
    "selector_type" TEXT NOT NULL,
    "fallbacks_json" TEXT NOT NULL DEFAULT '[]',
    "page_url" TEXT,
    "confidence" REAL NOT NULL DEFAULT 0.0,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "last_used_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "graphrag_nodes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "node_type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "line_number" INTEGER,
    "content" TEXT,
    "embedding_json" TEXT,
    "metadata" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "graphrag_edges" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "from_node_id" TEXT NOT NULL,
    "to_node_id" TEXT NOT NULL,
    "edge_type" TEXT NOT NULL,
    "weight" REAL NOT NULL DEFAULT 1.0,
    "metadata" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "graphrag_edges_from_node_id_fkey" FOREIGN KEY ("from_node_id") REFERENCES "graphrag_nodes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "graphrag_edges_to_node_id_fkey" FOREIGN KEY ("to_node_id") REFERENCES "graphrag_nodes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ai_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'gemini',
    "gemini_api_key" TEXT,
    "gemini_model" TEXT NOT NULL DEFAULT 'gemini-3-pro',
    "openai_api_key" TEXT,
    "openai_model" TEXT NOT NULL DEFAULT 'gpt-4o',
    "anthropic_api_key" TEXT,
    "anthropic_model" TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
    "browserbase_api_key" TEXT,
    "use_browserbase" BOOLEAN NOT NULL DEFAULT false,
    "stagehand_headless" BOOLEAN NOT NULL DEFAULT true,
    "stagehand_debug" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ai_recorder_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "application_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "environment" TEXT NOT NULL DEFAULT 'staging',
    "base_url" TEXT,
    "headless" BOOLEAN NOT NULL DEFAULT true,
    "total_tests" INTEGER NOT NULL DEFAULT 0,
    "completed_tests" INTEGER NOT NULL DEFAULT 0,
    "failed_tests" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "started_at" DATETIME,
    "completed_at" DATETIME
);

-- CreateTable
CREATE TABLE "ai_recorder_test_cases" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "session_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "order" INTEGER NOT NULL DEFAULT 0,
    "vero_code" TEXT,
    "target_url" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "stuck_at_step" INTEGER,
    "error_message" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "started_at" DATETIME,
    "completed_at" DATETIME,
    CONSTRAINT "ai_recorder_test_cases_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "ai_recorder_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ai_recorder_steps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "test_case_id" TEXT NOT NULL,
    "step_number" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "step_type" TEXT NOT NULL DEFAULT 'click',
    "vero_code" TEXT,
    "selector" TEXT,
    "selector_type" TEXT,
    "value" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER NOT NULL DEFAULT 10,
    "confidence" REAL NOT NULL DEFAULT 0.0,
    "screenshot_path" TEXT,
    "error_message" TEXT,
    "suggestions" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "started_at" DATETIME,
    "completed_at" DATETIME,
    CONSTRAINT "ai_recorder_steps_test_case_id_fkey" FOREIGN KEY ("test_case_id") REFERENCES "ai_recorder_test_cases" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sandboxes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "owner_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "source_branch" TEXT NOT NULL DEFAULT 'dev',
    "folder_path" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "last_sync_at" DATETIME,
    CONSTRAINT "sandboxes_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "sandboxes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "pull_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "author_id" TEXT NOT NULL,
    "sandbox_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "target_branch" TEXT NOT NULL DEFAULT 'dev',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "merged_at" DATETIME,
    "merged_by_id" TEXT,
    "closed_at" DATETIME,
    CONSTRAINT "pull_requests_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "pull_requests_merged_by_id_fkey" FOREIGN KEY ("merged_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "pull_requests_sandbox_id_fkey" FOREIGN KEY ("sandbox_id") REFERENCES "sandboxes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "pull_requests_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "pull_request_reviews" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pull_request_id" TEXT NOT NULL,
    "reviewer_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "comment" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "pull_request_reviews_pull_request_id_fkey" FOREIGN KEY ("pull_request_id") REFERENCES "pull_requests" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "pull_request_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "pull_request_comments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pull_request_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "file_path" TEXT,
    "line_number" INTEGER,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "pull_request_comments_pull_request_id_fkey" FOREIGN KEY ("pull_request_id") REFERENCES "pull_requests" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "pull_request_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "pull_request_files" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pull_request_id" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "additions" INTEGER NOT NULL DEFAULT 0,
    "deletions" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "pull_request_files_pull_request_id_fkey" FOREIGN KEY ("pull_request_id") REFERENCES "pull_requests" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "project_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "required_approvals" INTEGER NOT NULL DEFAULT 1,
    "require_test_pass" BOOLEAN NOT NULL DEFAULT true,
    "allow_self_approval" BOOLEAN NOT NULL DEFAULT false,
    "auto_delete_sandbox" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "project_settings_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_executions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "test_flow_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "exit_code" INTEGER,
    "target" TEXT NOT NULL,
    "agent_id" TEXT,
    "run_configuration_id" TEXT,
    "config_snapshot" TEXT,
    "triggered_by" TEXT NOT NULL DEFAULT 'manual',
    "started_at" DATETIME,
    "finished_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "executions_test_flow_id_fkey" FOREIGN KEY ("test_flow_id") REFERENCES "test_flows" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "executions_run_configuration_id_fkey" FOREIGN KEY ("run_configuration_id") REFERENCES "run_configurations" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_executions" ("agent_id", "created_at", "exit_code", "finished_at", "id", "started_at", "status", "target", "test_flow_id") SELECT "agent_id", "created_at", "exit_code", "finished_at", "id", "started_at", "status", "target", "test_flow_id" FROM "executions";
DROP TABLE "executions";
ALTER TABLE "new_executions" RENAME TO "executions";
CREATE INDEX "executions_test_flow_id_idx" ON "executions"("test_flow_id");
CREATE INDEX "executions_status_idx" ON "executions"("status");
CREATE INDEX "executions_run_configuration_id_idx" ON "executions"("run_configuration_id");
CREATE TABLE "new_projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "application_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "vero_path" TEXT,
    "git_initialized" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "projects_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_projects" ("created_at", "description", "id", "name", "updated_at", "vero_path") SELECT "created_at", "description", "id", "name", "updated_at", "vero_path" FROM "projects";
DROP TABLE "projects";
ALTER TABLE "new_projects" RENAME TO "projects";
CREATE INDEX "projects_application_id_idx" ON "projects"("application_id");
CREATE UNIQUE INDEX "projects_application_id_name_key" ON "projects"("application_id", "name");
CREATE TABLE "new_scheduled_tests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "application_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "test_pattern" TEXT NOT NULL,
    "cron_expression" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" TEXT NOT NULL DEFAULT '{}',
    "last_run_at" DATETIME,
    "next_run_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "scheduled_tests_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_scheduled_tests" ("config", "created_at", "cron_expression", "description", "enabled", "id", "last_run_at", "name", "next_run_at", "test_pattern", "timezone", "updated_at", "user_id") SELECT "config", "created_at", "cron_expression", "description", "enabled", "id", "last_run_at", "name", "next_run_at", "test_pattern", "timezone", "updated_at", "user_id" FROM "scheduled_tests";
DROP TABLE "scheduled_tests";
ALTER TABLE "new_scheduled_tests" RENAME TO "scheduled_tests";
CREATE INDEX "scheduled_tests_application_id_idx" ON "scheduled_tests"("application_id");
CREATE INDEX "scheduled_tests_user_id_idx" ON "scheduled_tests"("user_id");
CREATE INDEX "scheduled_tests_enabled_idx" ON "scheduled_tests"("enabled");
CREATE INDEX "scheduled_tests_next_run_at_idx" ON "scheduled_tests"("next_run_at");
CREATE TABLE "new_schedules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "workflow_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "cron_expression" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "test_selector" TEXT NOT NULL DEFAULT '{}',
    "notification_config" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "webhook_token" TEXT,
    "next_run_at" DATETIME,
    "last_run_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "parameters" TEXT,
    "default_execution_config" TEXT,
    "execution_target" TEXT NOT NULL DEFAULT 'local',
    "github_repo_full_name" TEXT,
    "github_branch" TEXT,
    "github_workflow_file" TEXT,
    "github_inputs" TEXT
);
INSERT INTO "new_schedules" ("created_at", "cron_expression", "description", "id", "is_active", "last_run_at", "name", "next_run_at", "notification_config", "test_selector", "timezone", "updated_at", "user_id", "workflow_id") SELECT "created_at", "cron_expression", "description", "id", "is_active", "last_run_at", "name", "next_run_at", "notification_config", "test_selector", "timezone", "updated_at", "user_id", "workflow_id" FROM "schedules";
DROP TABLE "schedules";
ALTER TABLE "new_schedules" RENAME TO "schedules";
CREATE UNIQUE INDEX "schedules_webhook_token_key" ON "schedules"("webhook_token");
CREATE INDEX "schedules_user_id_idx" ON "schedules"("user_id");
CREATE INDEX "schedules_is_active_idx" ON "schedules"("is_active");
CREATE INDEX "schedules_next_run_at_idx" ON "schedules"("next_run_at");
CREATE INDEX "schedules_webhook_token_idx" ON "schedules"("webhook_token");
CREATE TABLE "new_test_data_sheets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "application_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "page_object" TEXT,
    "description" TEXT,
    "columns" TEXT NOT NULL DEFAULT '[]',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "test_data_sheets_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_test_data_sheets" ("columns", "created_at", "description", "id", "name", "page_object", "updated_at") SELECT "columns", "created_at", "description", "id", "name", "page_object", "updated_at" FROM "test_data_sheets";
DROP TABLE "test_data_sheets";
ALTER TABLE "new_test_data_sheets" RENAME TO "test_data_sheets";
CREATE INDEX "test_data_sheets_application_id_idx" ON "test_data_sheets"("application_id");
CREATE UNIQUE INDEX "test_data_sheets_application_id_name_key" ON "test_data_sheets"("application_id", "name");
CREATE TABLE "new_test_flows" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflow_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "nodes" TEXT,
    "edges" TEXT,
    "variables" TEXT,
    "data_source" TEXT,
    "language" TEXT NOT NULL DEFAULT 'typescript',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "timeout" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "test_flows_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_test_flows" ("code", "created_at", "data_source", "edges", "id", "language", "name", "nodes", "updated_at", "variables", "workflow_id") SELECT "code", "created_at", "data_source", "edges", "id", "language", "name", "nodes", "updated_at", "variables", "workflow_id" FROM "test_flows";
DROP TABLE "test_flows";
ALTER TABLE "new_test_flows" RENAME TO "test_flows";
CREATE INDEX "test_flows_workflow_id_idx" ON "test_flows"("workflow_id");
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'qa_tester',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_users" ("created_at", "email", "id", "name", "password_hash", "updated_at") SELECT "created_at", "email", "id", "name", "password_hash", "updated_at" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE TABLE "new_workflows" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "application_id" TEXT,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "workflows_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "workflows_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_workflows" ("created_at", "description", "id", "name", "updated_at", "user_id") SELECT "created_at", "description", "id", "name", "updated_at", "user_id" FROM "workflows";
DROP TABLE "workflows";
ALTER TABLE "new_workflows" RENAME TO "workflows";
CREATE INDEX "workflows_application_id_idx" ON "workflows"("application_id");
CREATE INDEX "workflows_user_id_idx" ON "workflows"("user_id");
CREATE UNIQUE INDEX "workflows_application_id_name_key" ON "workflows"("application_id", "name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "applications_user_id_idx" ON "applications"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "applications_user_id_name_key" ON "applications"("user_id", "name");

-- CreateIndex
CREATE INDEX "application_members_application_id_idx" ON "application_members"("application_id");

-- CreateIndex
CREATE INDEX "application_members_user_id_idx" ON "application_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "application_members_application_id_user_id_key" ON "application_members"("application_id", "user_id");

-- CreateIndex
CREATE INDEX "recording_sessions_test_flow_id_idx" ON "recording_sessions"("test_flow_id");

-- CreateIndex
CREATE INDEX "recording_sessions_user_id_idx" ON "recording_sessions"("user_id");

-- CreateIndex
CREATE INDEX "recording_sessions_status_idx" ON "recording_sessions"("status");

-- CreateIndex
CREATE INDEX "recording_steps_session_id_idx" ON "recording_steps"("session_id");

-- CreateIndex
CREATE INDEX "recording_steps_step_number_idx" ON "recording_steps"("step_number");

-- CreateIndex
CREATE INDEX "app_environments_application_id_idx" ON "app_environments"("application_id");

-- CreateIndex
CREATE INDEX "app_environments_is_active_idx" ON "app_environments"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "app_environments_application_id_name_key" ON "app_environments"("application_id", "name");

-- CreateIndex
CREATE INDEX "app_env_variables_environment_id_idx" ON "app_env_variables"("environment_id");

-- CreateIndex
CREATE UNIQUE INDEX "app_env_variables_environment_id_key_key" ON "app_env_variables"("environment_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "data_storage_configs_application_id_key" ON "data_storage_configs"("application_id");

-- CreateIndex
CREATE INDEX "data_storage_configs_provider_idx" ON "data_storage_configs"("provider");

-- CreateIndex
CREATE INDEX "test_data_saved_views_sheet_id_idx" ON "test_data_saved_views"("sheet_id");

-- CreateIndex
CREATE INDEX "test_data_saved_views_is_default_idx" ON "test_data_saved_views"("is_default");

-- CreateIndex
CREATE UNIQUE INDEX "test_data_saved_views_sheet_id_name_key" ON "test_data_saved_views"("sheet_id", "name");

-- CreateIndex
CREATE INDEX "test_data_relationships_source_sheet_id_idx" ON "test_data_relationships"("source_sheet_id");

-- CreateIndex
CREATE INDEX "test_data_relationships_target_sheet_id_idx" ON "test_data_relationships"("target_sheet_id");

-- CreateIndex
CREATE UNIQUE INDEX "test_data_relationships_source_sheet_id_name_key" ON "test_data_relationships"("source_sheet_id", "name");

-- CreateIndex
CREATE INDEX "execution_environments_workflow_id_idx" ON "execution_environments"("workflow_id");

-- CreateIndex
CREATE UNIQUE INDEX "execution_environments_workflow_id_slug_key" ON "execution_environments"("workflow_id", "slug");

-- CreateIndex
CREATE INDEX "remote_runners_workflow_id_idx" ON "remote_runners"("workflow_id");

-- CreateIndex
CREATE INDEX "remote_runners_is_healthy_idx" ON "remote_runners"("is_healthy");

-- CreateIndex
CREATE UNIQUE INDEX "remote_runners_workflow_id_name_key" ON "remote_runners"("workflow_id", "name");

-- CreateIndex
CREATE INDEX "run_configurations_workflow_id_idx" ON "run_configurations"("workflow_id");

-- CreateIndex
CREATE INDEX "run_configurations_is_default_idx" ON "run_configurations"("is_default");

-- CreateIndex
CREATE UNIQUE INDEX "run_configurations_workflow_id_name_key" ON "run_configurations"("workflow_id", "name");

-- CreateIndex
CREATE INDEX "stored_credentials_workflow_id_idx" ON "stored_credentials"("workflow_id");

-- CreateIndex
CREATE UNIQUE INDEX "stored_credentials_workflow_id_name_key" ON "stored_credentials"("workflow_id", "name");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_idx" ON "audit_logs"("entity_type");

-- CreateIndex
CREATE INDEX "audit_logs_entity_id_idx" ON "audit_logs"("entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "notification_history_schedule_id_idx" ON "notification_history"("schedule_id");

-- CreateIndex
CREATE INDEX "notification_history_run_id_idx" ON "notification_history"("run_id");

-- CreateIndex
CREATE INDEX "notification_history_type_idx" ON "notification_history"("type");

-- CreateIndex
CREATE INDEX "notification_history_status_idx" ON "notification_history"("status");

-- CreateIndex
CREATE INDEX "notification_history_created_at_idx" ON "notification_history"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "github_integrations_user_id_key" ON "github_integrations"("user_id");

-- CreateIndex
CREATE INDEX "github_integrations_user_id_idx" ON "github_integrations"("user_id");

-- CreateIndex
CREATE INDEX "github_integrations_is_valid_idx" ON "github_integrations"("is_valid");

-- CreateIndex
CREATE INDEX "github_repository_configs_integration_id_idx" ON "github_repository_configs"("integration_id");

-- CreateIndex
CREATE INDEX "github_repository_configs_workflow_id_idx" ON "github_repository_configs"("workflow_id");

-- CreateIndex
CREATE UNIQUE INDEX "github_repository_configs_workflow_id_repo_full_name_key" ON "github_repository_configs"("workflow_id", "repo_full_name");

-- CreateIndex
CREATE INDEX "github_workflow_runs_workflow_id_idx" ON "github_workflow_runs"("workflow_id");

-- CreateIndex
CREATE INDEX "github_workflow_runs_execution_id_idx" ON "github_workflow_runs"("execution_id");

-- CreateIndex
CREATE INDEX "github_workflow_runs_status_idx" ON "github_workflow_runs"("status");

-- CreateIndex
CREATE INDEX "github_workflow_runs_created_at_idx" ON "github_workflow_runs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "github_workflow_runs_run_id_key" ON "github_workflow_runs"("run_id");

-- CreateIndex
CREATE INDEX "github_workflow_jobs_run_db_id_idx" ON "github_workflow_jobs"("run_db_id");

-- CreateIndex
CREATE INDEX "github_workflow_jobs_status_idx" ON "github_workflow_jobs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "github_workflow_jobs_job_id_key" ON "github_workflow_jobs"("job_id");

-- CreateIndex
CREATE INDEX "copilot_sessions_user_id_idx" ON "copilot_sessions"("user_id");

-- CreateIndex
CREATE INDEX "copilot_sessions_project_id_idx" ON "copilot_sessions"("project_id");

-- CreateIndex
CREATE INDEX "copilot_sessions_state_idx" ON "copilot_sessions"("state");

-- CreateIndex
CREATE INDEX "copilot_staged_changes_session_id_idx" ON "copilot_staged_changes"("session_id");

-- CreateIndex
CREATE INDEX "copilot_staged_changes_status_idx" ON "copilot_staged_changes"("status");

-- CreateIndex
CREATE INDEX "copilot_explorations_session_id_idx" ON "copilot_explorations"("session_id");

-- CreateIndex
CREATE INDEX "copilot_explorations_status_idx" ON "copilot_explorations"("status");

-- CreateIndex
CREATE INDEX "copilot_learned_selectors_project_id_idx" ON "copilot_learned_selectors"("project_id");

-- CreateIndex
CREATE INDEX "copilot_learned_selectors_element_description_idx" ON "copilot_learned_selectors"("element_description");

-- CreateIndex
CREATE INDEX "copilot_learned_selectors_usage_count_idx" ON "copilot_learned_selectors"("usage_count");

-- CreateIndex
CREATE INDEX "graphrag_nodes_project_id_idx" ON "graphrag_nodes"("project_id");

-- CreateIndex
CREATE INDEX "graphrag_nodes_node_type_idx" ON "graphrag_nodes"("node_type");

-- CreateIndex
CREATE INDEX "graphrag_nodes_name_idx" ON "graphrag_nodes"("name");

-- CreateIndex
CREATE INDEX "graphrag_edges_from_node_id_idx" ON "graphrag_edges"("from_node_id");

-- CreateIndex
CREATE INDEX "graphrag_edges_to_node_id_idx" ON "graphrag_edges"("to_node_id");

-- CreateIndex
CREATE INDEX "graphrag_edges_edge_type_idx" ON "graphrag_edges"("edge_type");

-- CreateIndex
CREATE UNIQUE INDEX "graphrag_edges_from_node_id_to_node_id_edge_type_key" ON "graphrag_edges"("from_node_id", "to_node_id", "edge_type");

-- CreateIndex
CREATE UNIQUE INDEX "ai_settings_user_id_key" ON "ai_settings"("user_id");

-- CreateIndex
CREATE INDEX "ai_recorder_sessions_user_id_idx" ON "ai_recorder_sessions"("user_id");

-- CreateIndex
CREATE INDEX "ai_recorder_sessions_application_id_idx" ON "ai_recorder_sessions"("application_id");

-- CreateIndex
CREATE INDEX "ai_recorder_sessions_status_idx" ON "ai_recorder_sessions"("status");

-- CreateIndex
CREATE INDEX "ai_recorder_test_cases_session_id_idx" ON "ai_recorder_test_cases"("session_id");

-- CreateIndex
CREATE INDEX "ai_recorder_test_cases_status_idx" ON "ai_recorder_test_cases"("status");

-- CreateIndex
CREATE INDEX "ai_recorder_test_cases_order_idx" ON "ai_recorder_test_cases"("order");

-- CreateIndex
CREATE INDEX "ai_recorder_steps_test_case_id_idx" ON "ai_recorder_steps"("test_case_id");

-- CreateIndex
CREATE INDEX "ai_recorder_steps_step_number_idx" ON "ai_recorder_steps"("step_number");

-- CreateIndex
CREATE INDEX "ai_recorder_steps_status_idx" ON "ai_recorder_steps"("status");

-- CreateIndex
CREATE INDEX "sandboxes_owner_id_idx" ON "sandboxes"("owner_id");

-- CreateIndex
CREATE INDEX "sandboxes_project_id_idx" ON "sandboxes"("project_id");

-- CreateIndex
CREATE INDEX "sandboxes_status_idx" ON "sandboxes"("status");

-- CreateIndex
CREATE UNIQUE INDEX "sandboxes_project_id_name_key" ON "sandboxes"("project_id", "name");

-- CreateIndex
CREATE INDEX "pull_requests_author_id_idx" ON "pull_requests"("author_id");

-- CreateIndex
CREATE INDEX "pull_requests_sandbox_id_idx" ON "pull_requests"("sandbox_id");

-- CreateIndex
CREATE INDEX "pull_requests_project_id_idx" ON "pull_requests"("project_id");

-- CreateIndex
CREATE INDEX "pull_requests_status_idx" ON "pull_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "pull_requests_project_id_number_key" ON "pull_requests"("project_id", "number");

-- CreateIndex
CREATE INDEX "pull_request_reviews_pull_request_id_idx" ON "pull_request_reviews"("pull_request_id");

-- CreateIndex
CREATE INDEX "pull_request_reviews_reviewer_id_idx" ON "pull_request_reviews"("reviewer_id");

-- CreateIndex
CREATE UNIQUE INDEX "pull_request_reviews_pull_request_id_reviewer_id_key" ON "pull_request_reviews"("pull_request_id", "reviewer_id");

-- CreateIndex
CREATE INDEX "pull_request_comments_pull_request_id_idx" ON "pull_request_comments"("pull_request_id");

-- CreateIndex
CREATE INDEX "pull_request_comments_author_id_idx" ON "pull_request_comments"("author_id");

-- CreateIndex
CREATE INDEX "pull_request_files_pull_request_id_idx" ON "pull_request_files"("pull_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "pull_request_files_pull_request_id_file_path_key" ON "pull_request_files"("pull_request_id", "file_path");

-- CreateIndex
CREATE UNIQUE INDEX "project_settings_project_id_key" ON "project_settings"("project_id");
