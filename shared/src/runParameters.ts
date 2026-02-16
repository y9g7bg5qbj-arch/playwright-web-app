/**
 * Run Parameters Types
 *
 * Per-execution variables that change across runs of the same test suite.
 * Examples: US state, product tier, user persona, feature flags.
 *
 * Variable precedence (highest wins):
 * 1. Per-run overrides (ad-hoc values entered at trigger time)
 * 2. Parameter set values (from selected preset like "California")
 * 3. Environment variables (from active AppEnvironment)
 * 4. Parameter defaults (from parameter definition schema)
 */

export type RunParameterType = 'string' | 'number' | 'boolean' | 'enum';

export interface RunParameterDefinition {
  id: string;
  applicationId: string;
  name: string;                    // Variable name (e.g., "state", "region")
  type: RunParameterType;
  label: string;                   // Display label (e.g., "US State")
  description?: string;
  defaultValue?: string | number | boolean;
  required: boolean;
  choices?: string[];              // For 'enum' type
  min?: number;                    // For 'number' type
  max?: number;                    // For 'number' type
  parameterize?: boolean;           // Split comma-separated values into separate test cases
  order: number;                   // Display order
  createdAt: string;
  updatedAt: string;
}

export interface RunParameterDefinitionCreate {
  name: string;
  type: RunParameterType;
  label: string;
  description?: string;
  defaultValue?: string | number | boolean;
  required?: boolean;
  choices?: string[];
  min?: number;
  max?: number;
  parameterize?: boolean;
  order?: number;
}

export interface RunParameterDefinitionUpdate {
  name?: string;
  type?: RunParameterType;
  label?: string;
  description?: string;
  defaultValue?: string | number | boolean;
  required?: boolean;
  choices?: string[];
  min?: number;
  max?: number;
  parameterize?: boolean;
  order?: number;
}

export interface RunParameterSet {
  id: string;
  applicationId: string;
  name: string;
  description?: string;
  values: Record<string, string | number | boolean>;
  isDefault: boolean;              // One default per application
  createdAt: string;
  updatedAt: string;
}

export interface RunParameterSetCreate {
  name: string;
  description?: string;
  values?: Record<string, string | number | boolean>;
  isDefault?: boolean;
}

export interface RunParameterSetUpdate {
  name?: string;
  description?: string;
  values?: Record<string, string | number | boolean>;
  isDefault?: boolean;
}
