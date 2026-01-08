import { create } from 'zustand';
import type { Workflow } from '@playwright-web-app/shared';
import { workflowsApi } from '@/api/workflows';

interface WorkflowState {
  workflows: Workflow[];
  currentWorkflow: Workflow | null;
  currentProjectId: string | null;
  isLoading: boolean;
  fetchWorkflows: (projectId?: string) => Promise<void>;
  fetchWorkflow: (id: string) => Promise<void>;
  createWorkflow: (name: string, projectId: string, description?: string) => Promise<Workflow>;
  updateWorkflow: (id: string, name?: string, description?: string) => Promise<void>;
  deleteWorkflow: (id: string) => Promise<void>;
  setCurrentWorkflow: (workflow: Workflow | null) => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflows: [],
  currentWorkflow: null,
  currentProjectId: null,
  isLoading: false,

  fetchWorkflows: async (projectId) => {
    set({ isLoading: true, currentProjectId: projectId || null });
    try {
      const workflows = await workflowsApi.getAll(projectId);
      set({ workflows, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  fetchWorkflow: async (id) => {
    set({ isLoading: true });
    try {
      const workflow = await workflowsApi.getOne(id);
      set({ currentWorkflow: workflow, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  createWorkflow: async (name, applicationId, description) => {
    const workflow = await workflowsApi.create({ name, applicationId, description });
    set({ workflows: [workflow, ...get().workflows] });
    return workflow;
  },

  updateWorkflow: async (id, name, description) => {
    const workflow = await workflowsApi.update(id, { name, description });
    set({
      workflows: get().workflows.map((w) => (w.id === id ? workflow : w)),
      currentWorkflow: get().currentWorkflow?.id === id ? workflow : get().currentWorkflow,
    });
  },

  deleteWorkflow: async (id) => {
    await workflowsApi.delete(id);
    set({
      workflows: get().workflows.filter((w) => w.id !== id),
      currentWorkflow: get().currentWorkflow?.id === id ? null : get().currentWorkflow,
    });
  },

  setCurrentWorkflow: (workflow) => {
    set({ currentWorkflow: workflow });
  },
}));
