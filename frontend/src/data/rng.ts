/** Small seeded PRNG (mulberry32) so the demo data is identical on every load. */
export function createRng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const between = (min: number, max: number) => min + (max - min) * next();
  const int = (min: number, max: number) => Math.floor(between(min, max + 1));
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(next() * arr.length)];
  // Cumulative weights are cached per list, so each pick is a binary search.
  const cumCache = new WeakMap<readonly [string, number][], number[]>();
  const weighted = (pairs: readonly [string, number][]) => {
    let cum = cumCache.get(pairs);
    if (!cum) {
      let acc = 0;
      cum = pairs.map(([, w]) => (acc += w));
      cumCache.set(pairs, cum);
    }
    const r = next() * cum[cum.length - 1];
    let lo = 0, hi = cum.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] < r) lo = mid + 1;
      else hi = mid;
    }
    return pairs[lo][0];
  };
  /** Approximately normal (Box–Muller). */
  const normal = (mean = 0, sd = 1) => {
    const u = Math.max(next(), 1e-9);
    const v = next();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  return { next, between, int, pick, weighted, normal };
}
