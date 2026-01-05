-- AlterTable
ALTER TABLE "test_flows" ADD COLUMN "edges" TEXT;
ALTER TABLE "test_flows" ADD COLUMN "nodes" TEXT;

-- CreateTable
CREATE TABLE "execution_steps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "execution_id" TEXT NOT NULL,
    "step_number" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "selector" TEXT,
    "selector_name" TEXT,
    "value" TEXT,
    "url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "duration" INTEGER,
    "error" TEXT,
    "screenshot" TEXT,
    "started_at" DATETIME,
    "finished_at" DATETIME,
    CONSTRAINT "execution_steps_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "executions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "execution_steps_execution_id_idx" ON "execution_steps"("execution_id");

-- CreateIndex
CREATE INDEX "execution_steps_step_number_idx" ON "execution_steps"("step_number");
