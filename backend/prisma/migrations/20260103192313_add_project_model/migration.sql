-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "vero_path" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "project_members" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "project_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "test_data_sheets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "page_object" TEXT,
    "description" TEXT,
    "columns" TEXT NOT NULL DEFAULT '[]',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "test_data_sheets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "test_data_rows" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sheet_id" TEXT NOT NULL,
    "scenario_id" TEXT NOT NULL,
    "data" TEXT NOT NULL DEFAULT '{}',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "test_data_rows_sheet_id_fkey" FOREIGN KEY ("sheet_id") REFERENCES "test_data_sheets" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "scheduled_tests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
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
    CONSTRAINT "scheduled_tests_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "scheduled_test_runs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schedule_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "triggered_by" TEXT NOT NULL DEFAULT 'schedule',
    "started_at" DATETIME,
    "completed_at" DATETIME,
    "execution_id" TEXT,
    "results" TEXT,
    "error_message" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "scheduled_test_runs_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "scheduled_tests" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "schedule_notification_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schedule_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "config" TEXT NOT NULL DEFAULT '{}',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "schedule_notification_configs_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "scheduled_tests" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "test_queue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schedule_id" TEXT,
    "test_pattern" TEXT NOT NULL,
    "config" TEXT NOT NULL DEFAULT '{}',
    "priority" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "error_message" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" DATETIME,
    "completed_at" DATETIME
);

-- CreateIndex
CREATE INDEX "projects_user_id_idx" ON "projects"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "projects_user_id_name_key" ON "projects"("user_id", "name");

-- CreateIndex
CREATE INDEX "project_members_project_id_idx" ON "project_members"("project_id");

-- CreateIndex
CREATE INDEX "project_members_user_id_idx" ON "project_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_members_project_id_user_id_key" ON "project_members"("project_id", "user_id");

-- CreateIndex
CREATE INDEX "test_data_sheets_project_id_idx" ON "test_data_sheets"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "test_data_sheets_project_id_name_key" ON "test_data_sheets"("project_id", "name");

-- CreateIndex
CREATE INDEX "test_data_rows_sheet_id_idx" ON "test_data_rows"("sheet_id");

-- CreateIndex
CREATE INDEX "test_data_rows_scenario_id_idx" ON "test_data_rows"("scenario_id");

-- CreateIndex
CREATE UNIQUE INDEX "test_data_rows_sheet_id_scenario_id_key" ON "test_data_rows"("sheet_id", "scenario_id");

-- CreateIndex
CREATE INDEX "scheduled_tests_project_id_idx" ON "scheduled_tests"("project_id");

-- CreateIndex
CREATE INDEX "scheduled_tests_user_id_idx" ON "scheduled_tests"("user_id");

-- CreateIndex
CREATE INDEX "scheduled_tests_enabled_idx" ON "scheduled_tests"("enabled");

-- CreateIndex
CREATE INDEX "scheduled_tests_next_run_at_idx" ON "scheduled_tests"("next_run_at");

-- CreateIndex
CREATE INDEX "scheduled_test_runs_schedule_id_idx" ON "scheduled_test_runs"("schedule_id");

-- CreateIndex
CREATE INDEX "scheduled_test_runs_status_idx" ON "scheduled_test_runs"("status");

-- CreateIndex
CREATE INDEX "scheduled_test_runs_created_at_idx" ON "scheduled_test_runs"("created_at");

-- CreateIndex
CREATE INDEX "schedule_notification_configs_schedule_id_idx" ON "schedule_notification_configs"("schedule_id");

-- CreateIndex
CREATE INDEX "schedule_notification_configs_type_idx" ON "schedule_notification_configs"("type");

-- CreateIndex
CREATE INDEX "test_queue_status_idx" ON "test_queue"("status");

-- CreateIndex
CREATE INDEX "test_queue_priority_idx" ON "test_queue"("priority");

-- CreateIndex
CREATE INDEX "test_queue_created_at_idx" ON "test_queue"("created_at");
