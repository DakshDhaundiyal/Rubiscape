import { create } from 'zustand';
import type { PanelType, ProcessResponse } from '../types';

interface AppState {
  dataset: any[] | null;
  filename: string;
  analysis: ProcessResponse | null;
  activePanel: PanelType;
  narrative: string;
  isGenerating: boolean;
  progress: number;
  progressStatus: string;
  
  setDataset: (data: any[], filename: string) => void;
  setAnalysis: (analysis: ProcessResponse) => void;
  setActivePanel: (panel: PanelType) => void;
  setNarrative: (updater: string | ((prev: string) => string)) => void;
  setIsGenerating: (val: boolean) => void;
  updateProgress: (status: string, val: number) => void;
}

export const useStore = create<AppState>((set) => ({
  dataset: null,
  filename: 'No Dataset',
  analysis: null,
  activePanel: 'overview',
  narrative: '',
  isGenerating: false,
  progress: 0,
  progressStatus: 'Standby',

  setDataset: (data, filename) => set({ dataset: data, filename }),
  setAnalysis: (analysis) => set({ analysis, progress: 100, progressStatus: 'Ready' }),
  setActivePanel: (panel) => set({ activePanel: panel }),
  setNarrative: (updater) => set((state) => ({ 
    narrative: typeof updater === 'function' ? updater(state.narrative) : updater 
  })),
  setIsGenerating: (val) => set({ isGenerating: val }),
  updateProgress: (status, val) => set({ progressStatus: status, progress: val })
}));
