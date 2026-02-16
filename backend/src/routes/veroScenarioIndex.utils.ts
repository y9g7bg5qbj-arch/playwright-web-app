import { readFile, readdir } from 'fs/promises';
import { join, posix } from 'path';
import { logger } from '../utils/logger';

export interface TagSummary {
    name: string;
    count: number;
}

export interface ScenarioProjectFacet {
    id: string;
    name: string;
    scenarioCount: number;
}

export interface ScenarioFolderFacet {
    path: string;
    name: string;
    scenarioCount: number;
}

export interface ScenarioFacets {
    tags: TagSummary[];
    projects: ScenarioProjectFacet[];
    folders: ScenarioFolderFacet[];
}

export interface ScenarioMeta {
    id?: string;
    name: string;
    tags: string[];
    line: number;
    featureName: string;
    filePath: string;
    projectId?: string;
    projectName?: string;
}

export interface FeatureWithScenarios {
    name: string;
    filePath: string;
    projectId?: string;
    projectName?: string;
    scenarios: ScenarioMeta[];
}

export interface ScenarioIndex {
    totalScenarios: number;
    totalFeatures: number;
    tags: TagSummary[];
    features: FeatureWithScenarios[];
    facets?: ScenarioFacets;
}

export interface ScenarioProjectMeta {
    projectId: string;
    projectName: string;
}

export interface ScanScenarioOptions {
    folder?: string;
    project?: ScenarioProjectMeta;
}

export type TagFilterMode = 'any' | 'all';

const FEATURE_DECLARATION_REGEX = /^\s*feature\s+(?:["']([^"']+)["']|([A-Za-z0-9_]+))/i;
const SCENARIO_DECLARATION_REGEX = /^\s*scenario\s+(?:["']([^"']+)["']|([A-Za-z0-9_]+))(?:\s+as\s+[A-Za-z0-9_]+)?((?:\s+@[A-Za-z0-9_-]+)*)/i;
const INLINE_TAG_REGEX = /@([A-Za-z0-9_-]+)/g;

export function normalizeRelativePath(value: string): string {
    const normalized = value.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
    if (!normalized || normalized === '.') {
        return '';
    }
    return normalized;
}

export function normalizeFolderPath(value?: string): string {
    if (!value) {
        return '';
    }
    return normalizeRelativePath(value);
}

export function normalizeTag(tag: string): string {
    return tag.trim().replace(/^@+/, '').toLowerCase();
}

export function normalizeTags(tags: string[]): string[] {
    return Array.from(new Set(tags.map(normalizeTag).filter(Boolean)));
}

export function parseTagsQuery(raw: unknown): string[] {
    if (!raw) {
        return [];
    }

    const parts: string[] = [];

    if (Array.isArray(raw)) {
        for (const value of raw) {
            if (typeof value !== 'string') {
                continue;
            }
            value.split(',').forEach((chunk) => parts.push(chunk));
        }
    } else if (typeof raw === 'string') {
        raw.split(',').forEach((chunk) => parts.push(chunk));
    }

    return normalizeTags(parts);
}

function isWithinFolderScope(relativePath: string, folderScope: string): boolean {
    if (!folderScope) {
        return true;
    }
    return relativePath === folderScope || relativePath.startsWith(`${folderScope}/`);
}

function shouldTraverseDirectory(relativeDirectoryPath: string, folderScope: string): boolean {
    if (!folderScope) {
        return true;
    }
    return (
        relativeDirectoryPath === folderScope ||
        folderScope.startsWith(`${relativeDirectoryPath}/`) ||
        relativeDirectoryPath.startsWith(`${folderScope}/`)
    );
}

function cloneFeatureWithScenarios(feature: FeatureWithScenarios, scenarios: ScenarioMeta[]): FeatureWithScenarios {
    return {
        ...feature,
        scenarios,
    };
}

// Parse a single .vero file and extract scenarios with metadata.
export function extractScenariosFromVero(
    content: string,
    filePath: string,
    project?: ScenarioProjectMeta
): FeatureWithScenarios | null {
    const lines = content.split('\n');

    const fallbackFeatureName = posix.basename(filePath, '.vero') || 'UnnamedFeature';
    let featureName = fallbackFeatureName;

    for (const line of lines) {
        const featureMatch = line.match(FEATURE_DECLARATION_REGEX);
        if (featureMatch) {
            featureName = (featureMatch[1] || featureMatch[2] || fallbackFeatureName).trim();
            break;
        }
    }

    const scenarios: ScenarioMeta[] = [];

    for (let index = 0; index < lines.length; index++) {
        const line = lines[index];
        const scenarioMatch = line.match(SCENARIO_DECLARATION_REGEX);
        if (!scenarioMatch) {
            continue;
        }

        const scenarioName = (scenarioMatch[1] || scenarioMatch[2] || '').trim();
        if (!scenarioName) {
            continue;
        }

        const tagsStr = scenarioMatch[3] || '';
        const tags = normalizeTags((tagsStr.match(INLINE_TAG_REGEX) || []).map((tag) => tag.substring(1)));
        const lineNumber = index + 1;

        scenarios.push({
            id: `${project?.projectId || 'project'}:${filePath}:${lineNumber}:${scenarioName}`,
            name: scenarioName,
            tags,
            line: lineNumber,
            featureName,
            filePath,
            projectId: project?.projectId,
            projectName: project?.projectName,
        });
    }

    if (scenarios.length === 0) {
        return null;
    }

    return {
        name: featureName,
        filePath,
        projectId: project?.projectId,
        projectName: project?.projectName,
        scenarios,
    };
}

// Recursively scan for .vero files and extract scenarios.
export async function scanForScenarios(
    dirPath: string,
    relativePath = '',
    options: ScanScenarioOptions = {}
): Promise<FeatureWithScenarios[]> {
    const results: FeatureWithScenarios[] = [];
    const folderScope = normalizeFolderPath(options.folder);

    const scanRecursive = async (currentPath: string, currentRelativePath: string): Promise<void> => {
        try {
            const entries = await readdir(currentPath, { withFileTypes: true });

            for (const entry of entries) {
                const nextRelativePath = normalizeRelativePath(
                    currentRelativePath ? `${currentRelativePath}/${entry.name}` : entry.name
                );
                const fullPath = join(currentPath, entry.name);

                if (entry.isDirectory()) {
                    if (folderScope && !shouldTraverseDirectory(nextRelativePath, folderScope)) {
                        continue;
                    }
                    await scanRecursive(fullPath, nextRelativePath);
                    continue;
                }

                if (!entry.isFile() || !entry.name.endsWith('.vero')) {
                    continue;
                }

                if (folderScope && !isWithinFolderScope(nextRelativePath, folderScope)) {
                    continue;
                }

                try {
                    const content = await readFile(fullPath, 'utf-8');
                    const feature = extractScenariosFromVero(content, nextRelativePath, options.project);
                    if (feature) {
                        results.push(feature);
                    }
                } catch (err) {
                    logger.warn(`[Vero Scenarios] Failed to read ${nextRelativePath}:`, err);
                }
            }
        } catch (err) {
            logger.warn(`[Vero Scenarios] Failed to scan ${currentPath}:`, err);
        }
    };

    await scanRecursive(dirPath, normalizeRelativePath(relativePath));
    return results;
}

export function flattenScenarios(features: FeatureWithScenarios[]): ScenarioMeta[] {
    return features.flatMap((feature) => feature.scenarios);
}

export function countScenarios(features: FeatureWithScenarios[]): number {
    return flattenScenarios(features).length;
}

export function filterFeaturesByFolder(features: FeatureWithScenarios[], folder?: string): FeatureWithScenarios[] {
    const folderScope = normalizeFolderPath(folder);
    if (!folderScope) {
        return features.map((feature) => cloneFeatureWithScenarios(feature, [...feature.scenarios]));
    }

    const filtered: FeatureWithScenarios[] = [];

    for (const feature of features) {
        const matchingScenarios = feature.scenarios.filter((scenario) =>
            isWithinFolderScope(normalizeRelativePath(scenario.filePath), folderScope)
        );
        if (matchingScenarios.length > 0) {
            filtered.push(cloneFeatureWithScenarios(feature, matchingScenarios));
        }
    }

    return filtered;
}

export function filterFeaturesBySearch(features: FeatureWithScenarios[], search?: string): FeatureWithScenarios[] {
    const query = (search || '').trim().toLowerCase();
    if (!query) {
        return features.map((feature) => cloneFeatureWithScenarios(feature, [...feature.scenarios]));
    }

    const filtered: FeatureWithScenarios[] = [];

    for (const feature of features) {
        const featureMatches =
            feature.name.toLowerCase().includes(query) ||
            (feature.projectName || '').toLowerCase().includes(query);

        const matchingScenarios = feature.scenarios.filter((scenario) => {
            if (featureMatches) {
                return true;
            }

            const haystack = `${scenario.name} ${scenario.filePath} ${scenario.featureName} ${scenario.projectName || ''}`.toLowerCase();
            return haystack.includes(query);
        });

        if (matchingScenarios.length > 0) {
            filtered.push(cloneFeatureWithScenarios(feature, matchingScenarios));
        }
    }

    return filtered;
}

export function filterFeaturesByTags(
    features: FeatureWithScenarios[],
    tags: string[],
    mode: TagFilterMode = 'any'
): FeatureWithScenarios[] {
    const normalizedFilterTags = normalizeTags(tags);
    if (normalizedFilterTags.length === 0) {
        return features.map((feature) => cloneFeatureWithScenarios(feature, [...feature.scenarios]));
    }

    const filtered: FeatureWithScenarios[] = [];

    for (const feature of features) {
        const matchingScenarios = feature.scenarios.filter((scenario) => {
            const scenarioTags = normalizeTags(scenario.tags);
            if (mode === 'all') {
                return normalizedFilterTags.every((tag) => scenarioTags.includes(tag));
            }
            return normalizedFilterTags.some((tag) => scenarioTags.includes(tag));
        });

        if (matchingScenarios.length > 0) {
            filtered.push(cloneFeatureWithScenarios(feature, matchingScenarios));
        }
    }

    return filtered;
}

export function filterFeaturesByExcludedTags(
    features: FeatureWithScenarios[],
    excludeTags: string[]
): FeatureWithScenarios[] {
    const normalizedExcludedTags = normalizeTags(excludeTags);
    if (normalizedExcludedTags.length === 0) {
        return features.map((feature) => cloneFeatureWithScenarios(feature, [...feature.scenarios]));
    }

    const filtered: FeatureWithScenarios[] = [];

    for (const feature of features) {
        const matchingScenarios = feature.scenarios.filter((scenario) => {
            const scenarioTags = normalizeTags(scenario.tags);
            return !normalizedExcludedTags.some((tag) => scenarioTags.includes(tag));
        });

        if (matchingScenarios.length > 0) {
            filtered.push(cloneFeatureWithScenarios(feature, matchingScenarios));
        }
    }

    return filtered;
}

export function buildTagSummary(features: FeatureWithScenarios[]): TagSummary[] {
    const tagCounts = new Map<string, number>();

    for (const scenario of flattenScenarios(features)) {
        for (const tag of normalizeTags(scenario.tags)) {
            tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        }
    }

    return Array.from(tagCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => {
            if (b.count !== a.count) {
                return b.count - a.count;
            }
            return a.name.localeCompare(b.name);
        });
}

export function buildFolderSummary(features: FeatureWithScenarios[]): ScenarioFolderFacet[] {
    const folderCounts = new Map<string, number>();

    for (const scenario of flattenScenarios(features)) {
        const scenarioPath = normalizeRelativePath(scenario.filePath);
        const dirname = normalizeRelativePath(posix.dirname(scenarioPath));
        const folderPath = dirname === '.' ? '' : dirname;
        folderCounts.set(folderPath, (folderCounts.get(folderPath) || 0) + 1);
    }

    return Array.from(folderCounts.entries())
        .map(([path, scenarioCount]) => ({
            path,
            name: path ? posix.basename(path) : 'Root',
            scenarioCount,
        }))
        .sort((a, b) => {
            if (b.scenarioCount !== a.scenarioCount) {
                return b.scenarioCount - a.scenarioCount;
            }
            return a.path.localeCompare(b.path);
        });
}

export function buildProjectSummary(
    features: FeatureWithScenarios[],
    projectCatalog: Array<{ id: string; name: string }> = []
): ScenarioProjectFacet[] {
    const counts = new Map<string, number>();
    const names = new Map<string, string>();

    for (const feature of features) {
        if (!feature.projectId) {
            continue;
        }
        names.set(feature.projectId, feature.projectName || feature.projectId);
        counts.set(feature.projectId, (counts.get(feature.projectId) || 0) + feature.scenarios.length);
    }

    if (projectCatalog.length > 0) {
        for (const project of projectCatalog) {
            names.set(project.id, project.name);
            if (!counts.has(project.id)) {
                counts.set(project.id, 0);
            }
        }
    }

    return Array.from(counts.entries())
        .map(([id, scenarioCount]) => ({
            id,
            name: names.get(id) || id,
            scenarioCount,
        }))
        .sort((a, b) => {
            if (b.scenarioCount !== a.scenarioCount) {
                return b.scenarioCount - a.scenarioCount;
            }
            return a.name.localeCompare(b.name);
        });
}
