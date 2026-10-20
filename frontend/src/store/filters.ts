import { create } from "zustand";
import { DEFAULT_FILTERS, type Filters } from "@/data/filters";

interface FilterState {
  filters: Filters;
  set: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  reset: () => void;
}

/** Global filters shared by every analytics page. */
export const useFilters = create<FilterState>((set) => ({
  filters: DEFAULT_FILTERS,
  set: (key, value) => set((s) => ({ filters: { ...s.filters, [key]: value } })),
  reset: () => set({ filters: DEFAULT_FILTERS }),
}));
