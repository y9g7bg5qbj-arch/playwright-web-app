// Types for the Scenario Dashboard

export interface TagSummary {
  name: string;
  count: number;
}

export interface ScenarioMeta {
  name: string;
  tags: string[];
  line: number;
  featureName: string;
  filePath: string;
}

export interface FeatureWithScenarios {
  name: string;
  filePath: string;
  scenarios: ScenarioMeta[];
}

export interface ScenarioIndex {
  totalScenarios: number;
  totalFeatures: number;
  tags: TagSummary[];
  features: FeatureWithScenarios[];
}

export type FilterMode = 'has' | 'missing';
export type FilterOperator = 'and' | 'or';
