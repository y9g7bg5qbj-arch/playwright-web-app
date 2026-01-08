import { prisma } from '../db/prisma';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import type {
  RunConfiguration,
  RunConfigurationCreate,
  RunConfigurationUpdate,
  ExecutionEnvironment,
  ExecutionEnvironmentCreate,
  ExecutionEnvironmentUpdate,
  RemoteRunner,
  RemoteRunnerCreate,
  RemoteRunnerUpdate,
  StoredCredential,
  StoredCredentialCreate,
  Viewport,
  LocalExecutionConfig,
  DockerExecutionConfig,
  GitHubActionsConfig,
  ExecutionTarget,
  BrowserType,
  BrowserChannel,
  ArtifactMode,
} from '@playwright-web-app/shared';

// ============================================
// RUN CONFIGURATION SERVICE
// ============================================

export class RunConfigurationService {
  // Verify workflow belongs to user
  private async verifyWorkflowAccess(userId: string, workflowId: string): Promise<void> {
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      throw new NotFoundError('Workflow not found');
    }

    if (workflow.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }
  }

  // ============================================
  // RUN CONFIGURATIONS
  // ============================================

  async findAllConfigurations(userId: string, workflowId: string): Promise<RunConfiguration[]> {
    await this.verifyWorkflowAccess(userId, workflowId);

    const configs = await prisma.runConfiguration.findMany({
      where: { workflowId },
      include: {
        environment: true,
        remoteRunner: true,
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });

    return configs.map(this.formatConfiguration);
  }

  async findConfigurationById(userId: string, configId: string): Promise<RunConfiguration> {
    const config = await prisma.runConfiguration.findUnique({
      where: { id: configId },
      include: {
        environment: true,
        remoteRunner: true,
      },
    });

    if (!config) {
      throw new NotFoundError('Run configuration not found');
    }

    await this.verifyWorkflowAccess(userId, config.workflowId);

    return this.formatConfiguration(config);
  }

  async createConfiguration(
    userId: string,
    workflowId: string,
    data: RunConfigurationCreate
  ): Promise<RunConfiguration> {
    await this.verifyWorkflowAccess(userId, workflowId);

    // If this is set as default, unset other defaults
    if (data.isDefault) {
      await prisma.runConfiguration.updateMany({
        where: { workflowId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const config = await prisma.runConfiguration.create({
      data: {
        workflowId,
        name: data.name,
        description: data.description,
        isDefault: data.isDefault ?? false,
        tags: JSON.stringify(data.tags ?? []),
        tagMode: data.tagMode ?? 'any',
        excludeTags: JSON.stringify(data.excludeTags ?? []),
        testFlowIds: JSON.stringify(data.testFlowIds ?? []),
        grep: data.grep,
        environmentId: data.environmentId,
        target: data.target ?? 'local',
        // Target-specific configs
        localConfig: data.localConfig ? JSON.stringify(data.localConfig) : null,
        dockerConfig: data.dockerConfig ? JSON.stringify(data.dockerConfig) : null,
        githubActionsConfig: data.githubActionsConfig ? JSON.stringify(data.githubActionsConfig) : null,
        // Legacy remote runner support
        remoteRunnerId: data.remoteRunnerId,
        // Browser settings
        browser: data.browser ?? 'chromium',
        browserChannel: data.browserChannel,
        headless: data.headless ?? true,
        viewport: JSON.stringify(data.viewport ?? { width: 1280, height: 720 }),
        // Parallel execution (legacy, prefer target-specific configs)
        workers: data.workers ?? 1,
        shardCount: data.shardCount ?? 1,
        // Retry & Timeout
        retries: data.retries ?? 0,
        timeout: data.timeout ?? 30000,
        // Artifacts
        tracing: data.tracing ?? 'on-failure',
        screenshot: data.screenshot ?? 'on-failure',
        video: data.video ?? 'off',
        // Advanced Config (JSON: fullyParallel, forbidOnly, maxFailures, etc.)
        advancedConfig: data.advancedConfig ? JSON.stringify(data.advancedConfig) : '{}',
        // GitHub Actions specific
        githubRepository: data.githubRepository,
        githubWorkflowPath: data.githubWorkflowPath,
      },
      include: {
        environment: true,
        remoteRunner: true,
      },
    });

    return this.formatConfiguration(config);
  }

  async updateConfiguration(
    userId: string,
    configId: string,
    data: RunConfigurationUpdate
  ): Promise<RunConfiguration> {
    const existing = await prisma.runConfiguration.findUnique({
      where: { id: configId },
    });

    if (!existing) {
      throw new NotFoundError('Run configuration not found');
    }

    await this.verifyWorkflowAccess(userId, existing.workflowId);

    // If this is set as default, unset other defaults
    if (data.isDefault) {
      await prisma.runConfiguration.updateMany({
        where: { workflowId: existing.workflowId, isDefault: true, id: { not: configId } },
        data: { isDefault: false },
      });
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;
    if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags);
    if (data.tagMode !== undefined) updateData.tagMode = data.tagMode;
    if (data.excludeTags !== undefined) updateData.excludeTags = JSON.stringify(data.excludeTags);
    if (data.testFlowIds !== undefined) updateData.testFlowIds = JSON.stringify(data.testFlowIds);
    if (data.grep !== undefined) updateData.grep = data.grep;
    if (data.environmentId !== undefined) updateData.environmentId = data.environmentId;
    if (data.target !== undefined) updateData.target = data.target;
    // Target-specific configs
    if (data.localConfig !== undefined) updateData.localConfig = data.localConfig ? JSON.stringify(data.localConfig) : null;
    if (data.dockerConfig !== undefined) updateData.dockerConfig = data.dockerConfig ? JSON.stringify(data.dockerConfig) : null;
    if (data.githubActionsConfig !== undefined) updateData.githubActionsConfig = data.githubActionsConfig ? JSON.stringify(data.githubActionsConfig) : null;
    // Legacy
    if (data.remoteRunnerId !== undefined) updateData.remoteRunnerId = data.remoteRunnerId;
    // Browser settings
    if (data.browser !== undefined) updateData.browser = data.browser;
    if (data.browserChannel !== undefined) updateData.browserChannel = data.browserChannel;
    if (data.headless !== undefined) updateData.headless = data.headless;
    if (data.viewport !== undefined) updateData.viewport = JSON.stringify(data.viewport);
    // Parallel execution (legacy)
    if (data.workers !== undefined) updateData.workers = data.workers;
    if (data.shardCount !== undefined) updateData.shardCount = data.shardCount;
    // Retry & Timeout
    if (data.retries !== undefined) updateData.retries = data.retries;
    if (data.timeout !== undefined) updateData.timeout = data.timeout;
    // Artifacts
    if (data.tracing !== undefined) updateData.tracing = data.tracing;
    if (data.screenshot !== undefined) updateData.screenshot = data.screenshot;
    if (data.video !== undefined) updateData.video = data.video;
    // Advanced Config
    if (data.advancedConfig !== undefined) updateData.advancedConfig = data.advancedConfig ? JSON.stringify(data.advancedConfig) : '{}';
    // GitHub Actions specific
    if (data.githubRepository !== undefined) updateData.githubRepository = data.githubRepository;
    if (data.githubWorkflowPath !== undefined) updateData.githubWorkflowPath = data.githubWorkflowPath;

    const config = await prisma.runConfiguration.update({
      where: { id: configId },
      data: updateData,
      include: {
        environment: true,
        remoteRunner: true,
      },
    });

    return this.formatConfiguration(config);
  }

  async deleteConfiguration(userId: string, configId: string): Promise<void> {
    const existing = await prisma.runConfiguration.findUnique({
      where: { id: configId },
    });

    if (!existing) {
      throw new NotFoundError('Run configuration not found');
    }

    await this.verifyWorkflowAccess(userId, existing.workflowId);

    await prisma.runConfiguration.delete({
      where: { id: configId },
    });
  }

  async duplicateConfiguration(
    userId: string,
    configId: string,
    newName: string
  ): Promise<RunConfiguration> {
    const existing = await this.findConfigurationById(userId, configId);

    return this.createConfiguration(userId, existing.workflowId, {
      name: newName,
      description: existing.description,
      isDefault: false,
      // Test Filters
      tags: existing.tags,
      tagMode: existing.tagMode,
      excludeTags: existing.excludeTags,
      testFlowIds: existing.testFlowIds,
      grep: existing.grep,
      // Environment
      environmentId: existing.environmentId,
      // Execution Target
      target: existing.target,
      // Target-specific configs
      localConfig: existing.localConfig,
      dockerConfig: existing.dockerConfig,
      githubActionsConfig: existing.githubActionsConfig,
      // Legacy
      remoteRunnerId: existing.remoteRunnerId,
      // Browser Settings
      browser: existing.browser,
      browserChannel: existing.browserChannel,
      headless: existing.headless,
      viewport: existing.viewport,
      // Parallel Execution (legacy)
      workers: existing.workers,
      shardCount: existing.shardCount,
      // Retry & Timeout
      retries: existing.retries,
      timeout: existing.timeout,
      // Artifacts
      tracing: existing.tracing,
      screenshot: existing.screenshot,
      video: existing.video,
      // Advanced Config
      advancedConfig: existing.advancedConfig,
      // GitHub Actions specific
      githubRepository: existing.githubRepository,
      githubWorkflowPath: existing.githubWorkflowPath,
    });
  }

  private formatConfiguration(config: any): RunConfiguration {
    return {
      id: config.id,
      workflowId: config.workflowId,
      name: config.name,
      description: config.description ?? undefined,
      isDefault: config.isDefault,
      // Test Filters
      tags: JSON.parse(config.tags),
      tagMode: config.tagMode as 'any' | 'all',
      excludeTags: JSON.parse(config.excludeTags),
      testFlowIds: JSON.parse(config.testFlowIds),
      grep: config.grep ?? undefined,
      // Environment
      environmentId: config.environmentId ?? undefined,
      environment: config.environment ? this.formatEnvironment(config.environment) : undefined,
      // Execution Target
      target: config.target as ExecutionTarget,
      // Target-specific configs
      localConfig: config.localConfig ? JSON.parse(config.localConfig) as LocalExecutionConfig : undefined,
      dockerConfig: config.dockerConfig ? JSON.parse(config.dockerConfig) as DockerExecutionConfig : undefined,
      githubActionsConfig: config.githubActionsConfig ? JSON.parse(config.githubActionsConfig) as GitHubActionsConfig : undefined,
      // Legacy
      remoteRunnerId: config.remoteRunnerId ?? undefined,
      remoteRunner: config.remoteRunner ? this.formatRunner(config.remoteRunner) : undefined,
      // Browser Settings
      browser: config.browser as BrowserType,
      browserChannel: config.browserChannel as BrowserChannel | undefined,
      headless: config.headless,
      viewport: JSON.parse(config.viewport) as Viewport,
      // Parallel Execution (legacy)
      workers: config.workers,
      shardCount: config.shardCount,
      // Retry & Timeout
      retries: config.retries,
      timeout: config.timeout,
      // Artifacts
      tracing: config.tracing as ArtifactMode,
      screenshot: config.screenshot as ArtifactMode,
      video: config.video as ArtifactMode,
      // Advanced Config
      advancedConfig: config.advancedConfig ? JSON.parse(config.advancedConfig) : undefined,
      // GitHub Actions specific
      githubRepository: config.githubRepository ?? undefined,
      githubWorkflowPath: config.githubWorkflowPath ?? undefined,
      createdAt: config.createdAt.toISOString(),
      updatedAt: config.updatedAt.toISOString(),
    };
  }

  // ============================================
  // EXECUTION ENVIRONMENTS
  // ============================================

  async findAllEnvironments(userId: string, workflowId: string): Promise<ExecutionEnvironment[]> {
    await this.verifyWorkflowAccess(userId, workflowId);

    const envs = await prisma.executionEnvironment.findMany({
      where: { workflowId },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });

    return envs.map(this.formatEnvironment);
  }

  async findEnvironmentById(userId: string, envId: string): Promise<ExecutionEnvironment> {
    const env = await prisma.executionEnvironment.findUnique({
      where: { id: envId },
    });

    if (!env) {
      throw new NotFoundError('Environment not found');
    }

    await this.verifyWorkflowAccess(userId, env.workflowId);

    return this.formatEnvironment(env);
  }

  async createEnvironment(
    userId: string,
    workflowId: string,
    data: ExecutionEnvironmentCreate
  ): Promise<ExecutionEnvironment> {
    await this.verifyWorkflowAccess(userId, workflowId);

    // If this is set as default, unset other defaults
    if (data.isDefault) {
      await prisma.executionEnvironment.updateMany({
        where: { workflowId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const env = await prisma.executionEnvironment.create({
      data: {
        workflowId,
        name: data.name,
        slug: data.slug,
        baseUrl: data.baseUrl,
        description: data.description,
        variables: JSON.stringify(data.variables ?? {}),
        isDefault: data.isDefault ?? false,
      },
    });

    return this.formatEnvironment(env);
  }

  async updateEnvironment(
    userId: string,
    envId: string,
    data: ExecutionEnvironmentUpdate
  ): Promise<ExecutionEnvironment> {
    const existing = await prisma.executionEnvironment.findUnique({
      where: { id: envId },
    });

    if (!existing) {
      throw new NotFoundError('Environment not found');
    }

    await this.verifyWorkflowAccess(userId, existing.workflowId);

    // If this is set as default, unset other defaults
    if (data.isDefault) {
      await prisma.executionEnvironment.updateMany({
        where: { workflowId: existing.workflowId, isDefault: true, id: { not: envId } },
        data: { isDefault: false },
      });
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.baseUrl !== undefined) updateData.baseUrl = data.baseUrl;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.variables !== undefined) updateData.variables = JSON.stringify(data.variables);
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;

    const env = await prisma.executionEnvironment.update({
      where: { id: envId },
      data: updateData,
    });

    return this.formatEnvironment(env);
  }

  async deleteEnvironment(userId: string, envId: string): Promise<void> {
    const existing = await prisma.executionEnvironment.findUnique({
      where: { id: envId },
    });

    if (!existing) {
      throw new NotFoundError('Environment not found');
    }

    await this.verifyWorkflowAccess(userId, existing.workflowId);

    await prisma.executionEnvironment.delete({
      where: { id: envId },
    });
  }

  private formatEnvironment(env: any): ExecutionEnvironment {
    return {
      id: env.id,
      workflowId: env.workflowId,
      name: env.name,
      slug: env.slug,
      baseUrl: env.baseUrl,
      description: env.description ?? undefined,
      variables: JSON.parse(env.variables),
      isDefault: env.isDefault,
      createdAt: env.createdAt.toISOString(),
      updatedAt: env.updatedAt.toISOString(),
    };
  }

  // ============================================
  // REMOTE RUNNERS
  // ============================================

  async findAllRunners(userId: string, workflowId: string): Promise<RemoteRunner[]> {
    await this.verifyWorkflowAccess(userId, workflowId);

    const runners = await prisma.remoteRunner.findMany({
      where: { workflowId },
      orderBy: [{ isHealthy: 'desc' }, { name: 'asc' }],
    });

    return runners.map(this.formatRunner);
  }

  async findRunnerById(userId: string, runnerId: string): Promise<RemoteRunner> {
    const runner = await prisma.remoteRunner.findUnique({
      where: { id: runnerId },
    });

    if (!runner) {
      throw new NotFoundError('Remote runner not found');
    }

    await this.verifyWorkflowAccess(userId, runner.workflowId);

    return this.formatRunner(runner);
  }

  async createRunner(
    userId: string,
    workflowId: string,
    data: RemoteRunnerCreate
  ): Promise<RemoteRunner> {
    await this.verifyWorkflowAccess(userId, workflowId);

    const runner = await prisma.remoteRunner.create({
      data: {
        workflowId,
        name: data.name,
        host: data.host,
        port: data.port ?? 22,
        authType: data.authType ?? 'ssh-key',
        credentialId: data.credentialId,
        dockerImage: data.dockerImage,
        maxWorkers: data.maxWorkers ?? 4,
        isHealthy: true,
      },
    });

    return this.formatRunner(runner);
  }

  async updateRunner(
    userId: string,
    runnerId: string,
    data: RemoteRunnerUpdate
  ): Promise<RemoteRunner> {
    const existing = await prisma.remoteRunner.findUnique({
      where: { id: runnerId },
    });

    if (!existing) {
      throw new NotFoundError('Remote runner not found');
    }

    await this.verifyWorkflowAccess(userId, existing.workflowId);

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.host !== undefined) updateData.host = data.host;
    if (data.port !== undefined) updateData.port = data.port;
    if (data.authType !== undefined) updateData.authType = data.authType;
    if (data.credentialId !== undefined) updateData.credentialId = data.credentialId;
    if (data.dockerImage !== undefined) updateData.dockerImage = data.dockerImage;
    if (data.maxWorkers !== undefined) updateData.maxWorkers = data.maxWorkers;

    const runner = await prisma.remoteRunner.update({
      where: { id: runnerId },
      data: updateData,
    });

    return this.formatRunner(runner);
  }

  async deleteRunner(userId: string, runnerId: string): Promise<void> {
    const existing = await prisma.remoteRunner.findUnique({
      where: { id: runnerId },
    });

    if (!existing) {
      throw new NotFoundError('Remote runner not found');
    }

    await this.verifyWorkflowAccess(userId, existing.workflowId);

    await prisma.remoteRunner.delete({
      where: { id: runnerId },
    });
  }

  async pingRunner(userId: string, runnerId: string): Promise<{ healthy: boolean; message?: string }> {
    const runner = await this.findRunnerById(userId, runnerId);

    // TODO: Implement actual health check (SSH connection, Docker ping, etc.)
    // For now, just simulate
    const isHealthy = true;
    const message = isHealthy ? 'Connection successful' : 'Failed to connect';

    await prisma.remoteRunner.update({
      where: { id: runnerId },
      data: {
        isHealthy,
        lastPingAt: new Date(),
        errorMessage: isHealthy ? null : message,
      },
    });

    return { healthy: isHealthy, message };
  }

  private formatRunner(runner: any): RemoteRunner {
    return {
      id: runner.id,
      workflowId: runner.workflowId,
      name: runner.name,
      host: runner.host,
      port: runner.port,
      authType: runner.authType as 'ssh-key' | 'token' | 'basic',
      credentialId: runner.credentialId ?? undefined,
      dockerImage: runner.dockerImage ?? undefined,
      maxWorkers: runner.maxWorkers,
      isHealthy: runner.isHealthy,
      lastPingAt: runner.lastPingAt?.toISOString() ?? undefined,
      errorMessage: runner.errorMessage ?? undefined,
      createdAt: runner.createdAt.toISOString(),
      updatedAt: runner.updatedAt.toISOString(),
    };
  }

  // ============================================
  // STORED CREDENTIALS
  // ============================================

  async findAllCredentials(userId: string, workflowId: string): Promise<StoredCredential[]> {
    await this.verifyWorkflowAccess(userId, workflowId);

    const credentials = await prisma.storedCredential.findMany({
      where: { workflowId },
      orderBy: { name: 'asc' },
    });

    return credentials.map(this.formatCredential);
  }

  async createCredential(
    userId: string,
    workflowId: string,
    data: StoredCredentialCreate
  ): Promise<StoredCredential> {
    await this.verifyWorkflowAccess(userId, workflowId);

    // TODO: Encrypt the value before storing
    const encryptedValue = Buffer.from(data.value).toString('base64');

    const credential = await prisma.storedCredential.create({
      data: {
        workflowId,
        name: data.name,
        type: data.type,
        encryptedValue,
      },
    });

    return this.formatCredential(credential);
  }

  async deleteCredential(userId: string, credentialId: string): Promise<void> {
    const existing = await prisma.storedCredential.findUnique({
      where: { id: credentialId },
    });

    if (!existing) {
      throw new NotFoundError('Credential not found');
    }

    await this.verifyWorkflowAccess(userId, existing.workflowId);

    await prisma.storedCredential.delete({
      where: { id: credentialId },
    });
  }

  private formatCredential(credential: any): StoredCredential {
    return {
      id: credential.id,
      workflowId: credential.workflowId,
      name: credential.name,
      type: credential.type as 'ssh-key' | 'token' | 'basic' | 'docker-registry',
      createdAt: credential.createdAt.toISOString(),
      updatedAt: credential.updatedAt.toISOString(),
    };
  }

  // ============================================
  // TAG MANAGEMENT
  // ============================================

  async getAllTags(userId: string, workflowId: string): Promise<string[]> {
    await this.verifyWorkflowAccess(userId, workflowId);

    const flows = await prisma.testFlow.findMany({
      where: { workflowId },
      select: { tags: true },
    });

    const allTags = new Set<string>();
    for (const flow of flows) {
      const tags = JSON.parse(flow.tags) as string[];
      tags.forEach((tag) => allTags.add(tag));
    }

    return Array.from(allTags).sort();
  }

  async updateTestFlowTags(userId: string, flowId: string, tags: string[]): Promise<string[]> {
    const flow = await prisma.testFlow.findUnique({
      where: { id: flowId },
      include: { workflow: true },
    });

    if (!flow) {
      throw new NotFoundError('Test flow not found');
    }

    await this.verifyWorkflowAccess(userId, flow.workflowId);

    await prisma.testFlow.update({
      where: { id: flowId },
      data: { tags: JSON.stringify(tags) },
    });

    return tags;
  }

  // ============================================
  // FILTER TEST FLOWS
  // ============================================

  async filterTestFlows(
    userId: string,
    workflowId: string,
    config: { tags: string[]; tagMode: 'any' | 'all'; excludeTags: string[]; testFlowIds: string[] }
  ): Promise<string[]> {
    await this.verifyWorkflowAccess(userId, workflowId);

    let flows = await prisma.testFlow.findMany({
      where: { workflowId },
      select: { id: true, tags: true },
    });

    // If specific flows are selected, filter to just those
    if (config.testFlowIds.length > 0) {
      flows = flows.filter((f) => config.testFlowIds.includes(f.id));
    }

    // Filter by tags
    if (config.tags.length > 0) {
      flows = flows.filter((flow) => {
        const flowTags = JSON.parse(flow.tags) as string[];
        if (config.tagMode === 'all') {
          return config.tags.every((tag) => flowTags.includes(tag));
        } else {
          return config.tags.some((tag) => flowTags.includes(tag));
        }
      });
    }

    // Exclude by tags
    if (config.excludeTags.length > 0) {
      flows = flows.filter((flow) => {
        const flowTags = JSON.parse(flow.tags) as string[];
        return !config.excludeTags.some((tag) => flowTags.includes(tag));
      });
    }

    return flows.map((f) => f.id);
  }
}
