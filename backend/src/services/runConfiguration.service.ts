/**
 * Run Configuration Service
 * NOW USES MONGODB INSTEAD OF PRISMA
 */

import {
  workflowRepository,
  runConfigurationRepository,
  executionEnvironmentRepository,
  remoteRunnerRepository,
  storedCredentialRepository,
  testFlowRepository
} from '../db/repositories/mongo';
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
    const workflow = await workflowRepository.findById(workflowId);

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

    const configs = await runConfigurationRepository.findByWorkflowId(workflowId);

    // Get environments and runners for each config
    const enrichedConfigs = await Promise.all(
      configs.map(async (config) => {
        const environment = config.environmentId
          ? await executionEnvironmentRepository.findById(config.environmentId)
          : null;
        const remoteRunner = config.localConfig
          ? null
          : null; // Remote runner lookup if needed
        return { ...config, environment, remoteRunner };
      })
    );

    return enrichedConfigs.map(this.formatConfiguration);
  }

  async findConfigurationById(userId: string, configId: string): Promise<RunConfiguration> {
    const config = await runConfigurationRepository.findById(configId);

    if (!config) {
      throw new NotFoundError('Run configuration not found');
    }

    await this.verifyWorkflowAccess(userId, config.workflowId);

    const environment = config.environmentId
      ? await executionEnvironmentRepository.findById(config.environmentId)
      : null;

    return this.formatConfiguration({ ...config, environment });
  }

  async createConfiguration(
    userId: string,
    workflowId: string,
    data: RunConfigurationCreate
  ): Promise<RunConfiguration> {
    await this.verifyWorkflowAccess(userId, workflowId);

    // If this is set as default, unset other defaults
    if (data.isDefault) {
      const configs = await runConfigurationRepository.findByWorkflowId(workflowId);
      for (const config of configs.filter(c => c.isDefault)) {
        await runConfigurationRepository.update(config.id, { isDefault: false });
      }
    }

    const config = await runConfigurationRepository.create({
      workflowId,
      name: data.name,
      description: data.description,
      isDefault: data.isDefault ?? false,
      tags: data.tags ?? [],
      tagMode: data.tagMode ?? 'any',
      excludeTags: data.excludeTags ?? [],
      testFlowIds: data.testFlowIds ?? [],
      grep: data.grep,
      environmentId: data.environmentId,
      target: data.target ?? 'local',
      localConfig: data.localConfig ? JSON.stringify(data.localConfig) : undefined,
      dockerConfig: data.dockerConfig ? JSON.stringify(data.dockerConfig) : undefined,
      githubActionsConfig: data.githubActionsConfig ? JSON.stringify(data.githubActionsConfig) : undefined,
      browser: data.browser ?? 'chromium',
      browserChannel: data.browserChannel,
      headless: data.headless ?? true,
      viewport: JSON.stringify(data.viewport ?? { width: 1280, height: 720 }),
      workers: data.workers ?? 1,
      shardCount: data.shardCount ?? 1,
      retries: data.retries ?? 0,
      timeout: data.timeout ?? 30000,
      tracing: data.tracing ?? 'on-failure',
      screenshot: data.screenshot ?? 'on-failure',
      video: data.video ?? 'off',
      advancedConfig: data.advancedConfig ? JSON.stringify(data.advancedConfig) : undefined,
    });

    const environment = config.environmentId
      ? await executionEnvironmentRepository.findById(config.environmentId)
      : null;

    return this.formatConfiguration({ ...config, environment });
  }

  async updateConfiguration(
    userId: string,
    configId: string,
    data: RunConfigurationUpdate
  ): Promise<RunConfiguration> {
    const existing = await runConfigurationRepository.findById(configId);

    if (!existing) {
      throw new NotFoundError('Run configuration not found');
    }

    await this.verifyWorkflowAccess(userId, existing.workflowId);

    // If this is set as default, unset other defaults
    if (data.isDefault) {
      const configs = await runConfigurationRepository.findByWorkflowId(existing.workflowId);
      for (const config of configs.filter(c => c.isDefault && c.id !== configId)) {
        await runConfigurationRepository.update(config.id, { isDefault: false });
      }
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.tagMode !== undefined) updateData.tagMode = data.tagMode;
    if (data.excludeTags !== undefined) updateData.excludeTags = data.excludeTags;
    if (data.testFlowIds !== undefined) updateData.testFlowIds = data.testFlowIds;
    if (data.grep !== undefined) updateData.grep = data.grep;
    if (data.environmentId !== undefined) updateData.environmentId = data.environmentId;
    if (data.target !== undefined) updateData.target = data.target;
    if (data.localConfig !== undefined) updateData.localConfig = data.localConfig ? JSON.stringify(data.localConfig) : null;
    if (data.dockerConfig !== undefined) updateData.dockerConfig = data.dockerConfig ? JSON.stringify(data.dockerConfig) : null;
    if (data.githubActionsConfig !== undefined) updateData.githubActionsConfig = data.githubActionsConfig ? JSON.stringify(data.githubActionsConfig) : null;
    if (data.browser !== undefined) updateData.browser = data.browser;
    if (data.browserChannel !== undefined) updateData.browserChannel = data.browserChannel;
    if (data.headless !== undefined) updateData.headless = data.headless;
    if (data.viewport !== undefined) updateData.viewport = JSON.stringify(data.viewport);
    if (data.workers !== undefined) updateData.workers = data.workers;
    if (data.shardCount !== undefined) updateData.shardCount = data.shardCount;
    if (data.retries !== undefined) updateData.retries = data.retries;
    if (data.timeout !== undefined) updateData.timeout = data.timeout;
    if (data.tracing !== undefined) updateData.tracing = data.tracing;
    if (data.screenshot !== undefined) updateData.screenshot = data.screenshot;
    if (data.video !== undefined) updateData.video = data.video;
    if (data.advancedConfig !== undefined) updateData.advancedConfig = data.advancedConfig ? JSON.stringify(data.advancedConfig) : null;

    const config = await runConfigurationRepository.update(configId, updateData);

    if (!config) {
      throw new NotFoundError('Run configuration not found');
    }

    const environment = config.environmentId
      ? await executionEnvironmentRepository.findById(config.environmentId)
      : null;

    return this.formatConfiguration({ ...config, environment });
  }

  async deleteConfiguration(userId: string, configId: string): Promise<void> {
    const existing = await runConfigurationRepository.findById(configId);

    if (!existing) {
      throw new NotFoundError('Run configuration not found');
    }

    await this.verifyWorkflowAccess(userId, existing.workflowId);

    await runConfigurationRepository.delete(configId);
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
      tags: existing.tags,
      tagMode: existing.tagMode,
      excludeTags: existing.excludeTags,
      testFlowIds: existing.testFlowIds,
      grep: existing.grep,
      environmentId: existing.environmentId,
      target: existing.target,
      localConfig: existing.localConfig,
      dockerConfig: existing.dockerConfig,
      githubActionsConfig: existing.githubActionsConfig,
      browser: existing.browser,
      browserChannel: existing.browserChannel,
      headless: existing.headless,
      viewport: existing.viewport,
      workers: existing.workers,
      shardCount: existing.shardCount,
      retries: existing.retries,
      timeout: existing.timeout,
      tracing: existing.tracing,
      screenshot: existing.screenshot,
      video: existing.video,
      advancedConfig: existing.advancedConfig,
    });
  }

  private formatConfiguration(config: any): RunConfiguration {
    return {
      id: config.id,
      workflowId: config.workflowId,
      name: config.name,
      description: config.description ?? undefined,
      isDefault: config.isDefault,
      tags: Array.isArray(config.tags) ? config.tags : JSON.parse(config.tags || '[]'),
      tagMode: config.tagMode as 'any' | 'all',
      excludeTags: Array.isArray(config.excludeTags) ? config.excludeTags : JSON.parse(config.excludeTags || '[]'),
      testFlowIds: Array.isArray(config.testFlowIds) ? config.testFlowIds : JSON.parse(config.testFlowIds || '[]'),
      grep: config.grep ?? undefined,
      environmentId: config.environmentId ?? undefined,
      environment: config.environment ? this.formatEnvironment(config.environment) : undefined,
      target: config.target as ExecutionTarget,
      localConfig: config.localConfig ? (typeof config.localConfig === 'string' ? JSON.parse(config.localConfig) : config.localConfig) as LocalExecutionConfig : undefined,
      dockerConfig: config.dockerConfig ? (typeof config.dockerConfig === 'string' ? JSON.parse(config.dockerConfig) : config.dockerConfig) as DockerExecutionConfig : undefined,
      githubActionsConfig: config.githubActionsConfig ? (typeof config.githubActionsConfig === 'string' ? JSON.parse(config.githubActionsConfig) : config.githubActionsConfig) as GitHubActionsConfig : undefined,
      remoteRunnerId: config.remoteRunnerId ?? undefined,
      remoteRunner: config.remoteRunner ? this.formatRunner(config.remoteRunner) : undefined,
      browser: config.browser as BrowserType,
      browserChannel: config.browserChannel as BrowserChannel | undefined,
      headless: config.headless,
      viewport: (typeof config.viewport === 'string' ? JSON.parse(config.viewport) : config.viewport) as Viewport,
      workers: config.workers,
      shardCount: config.shardCount,
      retries: config.retries,
      timeout: config.timeout,
      tracing: config.tracing as ArtifactMode,
      screenshot: config.screenshot as ArtifactMode,
      video: config.video as ArtifactMode,
      advancedConfig: config.advancedConfig ? (typeof config.advancedConfig === 'string' ? JSON.parse(config.advancedConfig) : config.advancedConfig) : undefined,
      createdAt: config.createdAt?.toISOString?.() || config.createdAt,
      updatedAt: config.updatedAt?.toISOString?.() || config.updatedAt,
    };
  }

  // ============================================
  // EXECUTION ENVIRONMENTS
  // ============================================

  async findAllEnvironments(userId: string, workflowId: string): Promise<ExecutionEnvironment[]> {
    await this.verifyWorkflowAccess(userId, workflowId);

    const envs = await executionEnvironmentRepository.findByWorkflowId(workflowId);

    return envs.map(this.formatEnvironment);
  }

  async findEnvironmentById(userId: string, envId: string): Promise<ExecutionEnvironment> {
    const env = await executionEnvironmentRepository.findById(envId);

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
      await executionEnvironmentRepository.updateManyByWorkflowId(workflowId, { isDefault: false });
    }

    const env = await executionEnvironmentRepository.create({
      workflowId,
      name: data.name,
      slug: data.slug,
      baseUrl: data.baseUrl,
      description: data.description,
      variables: JSON.stringify(data.variables ?? {}),
      isDefault: data.isDefault ?? false,
    });

    return this.formatEnvironment(env);
  }

  async updateEnvironment(
    userId: string,
    envId: string,
    data: ExecutionEnvironmentUpdate
  ): Promise<ExecutionEnvironment> {
    const existing = await executionEnvironmentRepository.findById(envId);

    if (!existing) {
      throw new NotFoundError('Environment not found');
    }

    await this.verifyWorkflowAccess(userId, existing.workflowId);

    // If this is set as default, unset other defaults
    if (data.isDefault) {
      const envs = await executionEnvironmentRepository.findByWorkflowId(existing.workflowId);
      for (const env of envs.filter(e => e.isDefault && e.id !== envId)) {
        await executionEnvironmentRepository.update(env.id, { isDefault: false });
      }
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.baseUrl !== undefined) updateData.baseUrl = data.baseUrl;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.variables !== undefined) updateData.variables = JSON.stringify(data.variables);
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;

    const env = await executionEnvironmentRepository.update(envId, updateData);

    if (!env) {
      throw new NotFoundError('Environment not found');
    }

    return this.formatEnvironment(env);
  }

  async deleteEnvironment(userId: string, envId: string): Promise<void> {
    const existing = await executionEnvironmentRepository.findById(envId);

    if (!existing) {
      throw new NotFoundError('Environment not found');
    }

    await this.verifyWorkflowAccess(userId, existing.workflowId);

    await executionEnvironmentRepository.delete(envId);
  }

  private formatEnvironment(env: any): ExecutionEnvironment {
    return {
      id: env.id,
      workflowId: env.workflowId,
      name: env.name,
      slug: env.slug,
      baseUrl: env.baseUrl,
      description: env.description ?? undefined,
      variables: typeof env.variables === 'string' ? JSON.parse(env.variables) : env.variables,
      isDefault: env.isDefault,
      createdAt: env.createdAt?.toISOString?.() || env.createdAt,
      updatedAt: env.updatedAt?.toISOString?.() || env.updatedAt,
    };
  }

  // ============================================
  // REMOTE RUNNERS
  // ============================================

  async findAllRunners(userId: string, workflowId: string): Promise<RemoteRunner[]> {
    await this.verifyWorkflowAccess(userId, workflowId);

    const runners = await remoteRunnerRepository.findByWorkflowId(workflowId);

    return runners.map(this.formatRunner);
  }

  async findRunnerById(userId: string, runnerId: string): Promise<RemoteRunner> {
    const runner = await remoteRunnerRepository.findById(runnerId);

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

    const runner = await remoteRunnerRepository.create({
      workflowId,
      name: data.name,
      host: data.host,
      port: data.port ?? 22,
      authType: data.authType ?? 'ssh-key',
      credentialId: data.credentialId,
      dockerImage: data.dockerImage,
      maxWorkers: data.maxWorkers ?? 4,
      isHealthy: true,
    });

    return this.formatRunner(runner);
  }

  async updateRunner(
    userId: string,
    runnerId: string,
    data: RemoteRunnerUpdate
  ): Promise<RemoteRunner> {
    const existing = await remoteRunnerRepository.findById(runnerId);

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

    const runner = await remoteRunnerRepository.update(runnerId, updateData);

    if (!runner) {
      throw new NotFoundError('Remote runner not found');
    }

    return this.formatRunner(runner);
  }

  async deleteRunner(userId: string, runnerId: string): Promise<void> {
    const existing = await remoteRunnerRepository.findById(runnerId);

    if (!existing) {
      throw new NotFoundError('Remote runner not found');
    }

    await this.verifyWorkflowAccess(userId, existing.workflowId);

    await remoteRunnerRepository.delete(runnerId);
  }

  async pingRunner(userId: string, runnerId: string): Promise<{ healthy: boolean; message?: string }> {
    const runner = await this.findRunnerById(userId, runnerId);

    // TODO: Implement actual health check
    const isHealthy = true;
    const message = isHealthy ? 'Connection successful' : 'Failed to connect';

    await remoteRunnerRepository.update(runnerId, {
      isHealthy,
      lastPingAt: new Date(),
      errorMessage: isHealthy ? undefined : message,
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
      lastPingAt: runner.lastPingAt?.toISOString?.() ?? undefined,
      errorMessage: runner.errorMessage ?? undefined,
      createdAt: runner.createdAt?.toISOString?.() || runner.createdAt,
      updatedAt: runner.updatedAt?.toISOString?.() || runner.updatedAt,
    };
  }

  // ============================================
  // STORED CREDENTIALS
  // ============================================

  async findAllCredentials(userId: string, workflowId: string): Promise<StoredCredential[]> {
    await this.verifyWorkflowAccess(userId, workflowId);

    const credentials = await storedCredentialRepository.findByWorkflowId(workflowId);

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

    const credential = await storedCredentialRepository.create({
      workflowId,
      name: data.name,
      type: data.type,
      encryptedValue,
    });

    return this.formatCredential(credential);
  }

  async deleteCredential(userId: string, credentialId: string): Promise<void> {
    const existing = await storedCredentialRepository.findById(credentialId);

    if (!existing) {
      throw new NotFoundError('Credential not found');
    }

    await this.verifyWorkflowAccess(userId, existing.workflowId);

    await storedCredentialRepository.delete(credentialId);
  }

  private formatCredential(credential: any): StoredCredential {
    return {
      id: credential.id,
      workflowId: credential.workflowId,
      name: credential.name,
      type: credential.type as 'ssh-key' | 'token' | 'basic' | 'docker-registry',
      createdAt: credential.createdAt?.toISOString?.() || credential.createdAt,
      updatedAt: credential.updatedAt?.toISOString?.() || credential.updatedAt,
    };
  }

  // ============================================
  // TAG MANAGEMENT
  // ============================================

  async getAllTags(userId: string, workflowId: string): Promise<string[]> {
    await this.verifyWorkflowAccess(userId, workflowId);

    const flows = await testFlowRepository.findByWorkflowId(workflowId);

    const allTags = new Set<string>();
    for (const flow of flows) {
      const tags = flow.tags || [];
      tags.forEach((tag: string) => allTags.add(tag));
    }

    return Array.from(allTags).sort();
  }

  async updateTestFlowTags(userId: string, flowId: string, tags: string[]): Promise<string[]> {
    const flow = await testFlowRepository.findById(flowId);

    if (!flow) {
      throw new NotFoundError('Test flow not found');
    }

    const workflow = await workflowRepository.findById(flow.workflowId);

    if (!workflow || workflow.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    await testFlowRepository.update(flowId, { tags });

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

    let flows = await testFlowRepository.findByWorkflowId(workflowId);

    // If specific flows are selected, filter to just those
    if (config.testFlowIds.length > 0) {
      flows = flows.filter((f) => config.testFlowIds.includes(f.id));
    }

    // Filter by tags
    if (config.tags.length > 0) {
      flows = flows.filter((flow) => {
        const flowTags = flow.tags || [];
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
        const flowTags = flow.tags || [];
        return !config.excludeTags.some((tag) => flowTags.includes(tag));
      });
    }

    return flows.map((f) => f.id);
  }
}
