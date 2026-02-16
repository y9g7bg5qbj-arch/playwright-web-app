import { Router, Response, NextFunction } from 'express';
import { join } from 'path';
import { existsSync } from 'fs';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { resolveProjectPath } from './veroProjectPath.utils';
import { buildFolderSummary, buildProjectSummary, buildTagSummary, countScenarios, filterFeaturesByExcludedTags, filterFeaturesByFolder, filterFeaturesBySearch, filterFeaturesByTags, parseTagsQuery, scanForScenarios, type ScenarioFacets, type ScenarioFolderFacet, type ScenarioIndex, type ScenarioProjectFacet, type TagFilterMode } from './veroScenarioIndex.utils';
import { projectRepository } from '../db/repositories/mongo';
import { logger } from '../utils/logger';

function toAbsoluteProjectPath(projectPath: string): string {
    return projectPath.startsWith('/') ? projectPath : join(process.cwd(), projectPath);
}

function buildEmptyScenarioIndex(facets?: Partial<ScenarioFacets>): ScenarioIndex {
    const emptyFacets: ScenarioFacets = {
        tags: [],
        projects: [],
        folders: [],
        ...facets,
    };

    return {
        totalScenarios: 0,
        totalFeatures: 0,
        tags: [],
        features: [],
        facets: emptyFacets,
    };
}

const scenarioRouter = Router();

// GET /api/vero/scenarios - Get all scenarios with tags for the dashboard
scenarioRouter.get('/scenarios', authenticateToken, async (req: AuthRequest, res: Response, _next: NextFunction) => {
    try {
        const applicationId = typeof req.query.applicationId === 'string' ? req.query.applicationId : undefined;
        const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : undefined;
        const veroPathParam = typeof req.query.veroPath === 'string' ? req.query.veroPath : undefined;
        const folder = typeof req.query.folder === 'string' ? req.query.folder : undefined;
        const search = typeof req.query.search === 'string' ? req.query.search : undefined;
        const tagModeRaw = typeof req.query.tagMode === 'string' ? req.query.tagMode.toLowerCase() : 'any';
        const tagMode: TagFilterMode = tagModeRaw === 'all' ? 'all' : 'any';
        const selectedTags = parseTagsQuery(req.query.tags);
        const excludedTags = parseTagsQuery(req.query.excludeTags);

        let scopedFeatures: ScenarioIndex['features'] = [];
        let projectFacets: ScenarioProjectFacet[] = [];
        let folderFacets: ScenarioFolderFacet[] = [];

        if (applicationId) {
            const applicationProjects = await projectRepository.findByApplicationId(applicationId);
            const allScannedFeatures: ScenarioIndex['features'] = [];

            for (const project of applicationProjects) {
                const projectPath = project.veroPath?.trim();
                if (!projectPath) {
                    continue;
                }

                const fullPath = toAbsoluteProjectPath(projectPath);
                if (!existsSync(fullPath)) {
                    continue;
                }

                const projectFeatures = await scanForScenarios(fullPath, '', {
                    project: {
                        projectId: project.id,
                        projectName: project.name,
                    },
                });
                allScannedFeatures.push(...projectFeatures);
            }

            projectFacets = buildProjectSummary(
                allScannedFeatures,
                applicationProjects.map((project) => ({ id: project.id, name: project.name }))
            );

            const projectScopedFeatures = projectId
                ? allScannedFeatures.filter((feature) => feature.projectId === projectId)
                : allScannedFeatures;

            if (projectId) {
                folderFacets = buildFolderSummary(projectScopedFeatures);
                scopedFeatures = filterFeaturesByFolder(projectScopedFeatures, folder);
            } else {
                scopedFeatures = projectScopedFeatures;
            }
        } else {
            // Legacy fallback path for callers that still send projectId/veroPath only.
            const projectPath = await resolveProjectPath(veroPathParam, projectId);
            const fullPath = toAbsoluteProjectPath(projectPath);

            if (!existsSync(fullPath)) {
                return res.json({
                    success: true,
                    data: buildEmptyScenarioIndex(
                        projectId
                            ? {
                                  projects: [{ id: projectId, name: projectId, scenarioCount: 0 }],
                              }
                            : undefined
                    ),
                });
            }

            const legacyFeatures = await scanForScenarios(fullPath, '', projectId
                ? {
                      project: {
                          projectId,
                          projectName: projectId,
                      },
                  }
                : undefined);

            scopedFeatures = filterFeaturesByFolder(legacyFeatures, folder);
            folderFacets = buildFolderSummary(legacyFeatures);

            if (projectId) {
                projectFacets = [
                    {
                        id: projectId,
                        name: projectId,
                        scenarioCount: countScenarios(legacyFeatures),
                    },
                ];
            }
        }

        const searchFilteredFeatures = filterFeaturesBySearch(scopedFeatures, search);
        const tags = buildTagSummary(searchFilteredFeatures);
        const includeFilteredFeatures = filterFeaturesByTags(searchFilteredFeatures, selectedTags, tagMode);
        const fullyFilteredFeatures = filterFeaturesByExcludedTags(includeFilteredFeatures, excludedTags);

        const result: ScenarioIndex = {
            totalScenarios: countScenarios(fullyFilteredFeatures),
            totalFeatures: fullyFilteredFeatures.length,
            tags,
            features: fullyFilteredFeatures,
            facets: {
                projects: projectFacets,
                folders: folderFacets,
                tags,
            },
        };

        logger.debug(
            `[Vero Scenarios] application=${applicationId || 'n/a'} project=${projectId || 'all'} folder=${folder || 'all'} search="${search || ''}" tags=${selectedTags.join('|') || 'none'} exclude=${excludedTags.join('|') || 'none'} mode=${tagMode} -> ${result.totalScenarios} scenarios`
        );

        res.json({ success: true, data: result });
    } catch (error) {
        logger.error('[Vero Scenarios] Failed to get scenarios:', error);
        res.status(500).json({ success: false, error: 'Failed to get scenarios' });
    }
});

export { scenarioRouter as veroScenarioRouter };
