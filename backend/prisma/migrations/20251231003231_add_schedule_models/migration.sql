-- CreateTable
CREATE TABLE "data_tables" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflow_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "columns" TEXT NOT NULL DEFAULT '[]',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "data_rows" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "table_id" TEXT NOT NULL,
    "data" TEXT NOT NULL DEFAULT '{}',
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "data_rows_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "data_tables" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "schedules" (
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
    "next_run_at" DATETIME,
    "last_run_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "schedule_runs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schedule_id" TEXT NOT NULL,
    "trigger_type" TEXT NOT NULL DEFAULT 'scheduled',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "test_count" INTEGER NOT NULL DEFAULT 0,
    "passed_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "skipped_count" INTEGER NOT NULL DEFAULT 0,
    "duration_ms" INTEGER,
    "artifacts_path" TEXT,
    "error_message" TEXT,
    "webhook_token" TEXT,
    "started_at" DATETIME,
    "completed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "schedule_runs_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedules" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "schedule_test_results" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "run_id" TEXT NOT NULL,
    "test_name" TEXT NOT NULL,
    "test_path" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "duration_ms" INTEGER,
    "error_message" TEXT,
    "error_stack" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "screenshot_path" TEXT,
    "trace_path" TEXT,
    "started_at" DATETIME,
    "completed_at" DATETIME,
    CONSTRAINT "schedule_test_results_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "schedule_runs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "data_tables_workflow_id_idx" ON "data_tables"("workflow_id");

-- CreateIndex
CREATE UNIQUE INDEX "data_tables_workflow_id_name_key" ON "data_tables"("workflow_id", "name");

-- CreateIndex
CREATE INDEX "data_rows_table_id_idx" ON "data_rows"("table_id");

-- CreateIndex
CREATE INDEX "data_rows_order_idx" ON "data_rows"("order");

-- CreateIndex
CREATE INDEX "schedules_user_id_idx" ON "schedules"("user_id");

-- CreateIndex
CREATE INDEX "schedules_is_active_idx" ON "schedules"("is_active");

-- CreateIndex
CREATE INDEX "schedules_next_run_at_idx" ON "schedules"("next_run_at");

-- CreateIndex
CREATE INDEX "schedule_runs_schedule_id_idx" ON "schedule_runs"("schedule_id");

-- CreateIndex
CREATE INDEX "schedule_runs_status_idx" ON "schedule_runs"("status");

-- CreateIndex
CREATE INDEX "schedule_runs_created_at_idx" ON "schedule_runs"("created_at");

-- CreateIndex
CREATE INDEX "schedule_test_results_run_id_idx" ON "schedule_test_results"("run_id");

-- CreateIndex
CREATE INDEX "schedule_test_results_status_idx" ON "schedule_test_results"("status");
