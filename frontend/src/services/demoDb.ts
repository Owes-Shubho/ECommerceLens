import { generateDemoData } from "@/data/generate";
import type { DemoData } from "@/data/types";

let cache: DemoData | null = null;

/** The in-browser demo dataset. Generated once per page load (deterministic). */
export function demoDb(): DemoData {
  if (!cache) cache = generateDemoData();
  return cache;
}
