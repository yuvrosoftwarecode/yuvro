import { create } from "zustand";
import { performanceApi } from "../api/performanceApi";
import { PerformanceStats } from "../types";

interface PerformanceStoreState {
  data: PerformanceStats | null;
  loading: boolean;
  error: string | null;
  fetchPerformance: (force?: boolean) => Promise<PerformanceStats | null>;
  setPerformanceData: (data: PerformanceStats) => void;
  fetchPublicPerformance: (username: string) => Promise<PerformanceStats | null>;
}

export const usePerformanceStore = create<PerformanceStoreState>((set, get) => ({
  data: null,
  loading: false,
  error: null,

  fetchPerformance: async (force = false) => {
    if (!force && get().data) {
      return get().data;
    }
    set({ loading: true, error: null });
    try {
      const res = await performanceApi.getPerformance();
      set({ data: res, loading: false });
      return res;
    } catch (err: any) {
      set({ error: err.message || "Failed to load performance", loading: false });
      return null;
    }
  },

  setPerformanceData: (data: PerformanceStats) => set({ data }),

  fetchPublicPerformance: async (username: string) => {
    set({ loading: true, error: null });
    try {
      const res = await performanceApi.getPublicPerformance(username);
      set({ data: res, loading: false });
      return res;
    } catch (err: any) {
      set({ error: err.message || "Failed to load performance", loading: false });
      return null;
    }
  },
}));
