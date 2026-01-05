-- AlterTable
ALTER TABLE "test_flows" ADD COLUMN "data_source" TEXT;
ALTER TABLE "test_flows" ADD COLUMN "variables" TEXT;

-- CreateTable
CREATE TABLE "global_variables" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'string',
    "sensitive" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "global_variables_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "environments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "environments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "environment_variables" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "environment_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'string',
    "sensitive" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "environment_variables_environment_id_fkey" FOREIGN KEY ("environment_id") REFERENCES "environments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "workflow_variables" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflow_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'string',
    "sensitive" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "workflow_variables_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "object_repositories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflow_id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Object Repository',
    "description" TEXT,
    "global_elements" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "object_repositories_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "page_objects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "repository_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "url_pattern" TEXT,
    "base_url" TEXT,
    "elements" TEXT NOT NULL DEFAULT '[]',
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "page_objects_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "object_repositories" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "global_variables_user_id_idx" ON "global_variables"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "global_variables_user_id_key_key" ON "global_variables"("user_id", "key");

-- CreateIndex
CREATE INDEX "environments_user_id_idx" ON "environments"("user_id");

-- CreateIndex
CREATE INDEX "environments_is_active_idx" ON "environments"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "environments_user_id_name_key" ON "environments"("user_id", "name");

-- CreateIndex
CREATE INDEX "environment_variables_environment_id_idx" ON "environment_variables"("environment_id");

-- CreateIndex
CREATE UNIQUE INDEX "environment_variables_environment_id_key_key" ON "environment_variables"("environment_id", "key");

-- CreateIndex
CREATE INDEX "workflow_variables_workflow_id_idx" ON "workflow_variables"("workflow_id");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_variables_workflow_id_key_key" ON "workflow_variables"("workflow_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "object_repositories_workflow_id_key" ON "object_repositories"("workflow_id");

-- CreateIndex
CREATE INDEX "page_objects_repository_id_idx" ON "page_objects"("repository_id");

-- CreateIndex
CREATE INDEX "page_objects_order_idx" ON "page_objects"("order");
