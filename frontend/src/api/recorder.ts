import { apiClient } from './client';

export const recorderApi = {
  async startRecording(url: string, testFlowId: string) {
    const response = await apiClient.post<any>('/recorder/start', { url, testFlowId });
    return response;
  },

  async getCode(testFlowId: string) {
    const response = await apiClient.get<any>(`/recorder/code/${testFlowId}`);
    return response;
  },

  async stopRecording(testFlowId: string) {
    const response = await apiClient.post<any>(`/recorder/stop/${testFlowId}`);
    return response;
  },
};
