import { useQuery } from "@tanstack/react-query";
import { useFilters } from "@/store/filters";
import type { Filters } from "@/data/filters";

/** Runs a service call keyed by the global filters (plus any extra keys), with caching from TanStack Query. */
export function useFiltered<T>(name: string, fn: (f: Filters) => Promise<T>, extra: unknown[] = []) {
  const filters = useFilters((s) => s.filters);
  return useQuery({ queryKey: [name, filters, ...extra], queryFn: () => fn(filters), placeholderData: (prev) => prev });
}
