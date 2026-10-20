"""Seeded PRNG (mulberry32), bit-for-bit identical to frontend/src/data/rng.ts."""
from __future__ import annotations

import math
from bisect import bisect_left
from typing import Sequence, TypeVar

T = TypeVar("T")
M32 = 0xFFFFFFFF


def _imul(a: int, b: int) -> int:
    return (a * b) & M32


def js_round(x: float) -> float:
    """JavaScript Math.round (halves round up), unlike Python's banker's rounding."""
    return float(math.floor(x + 0.5))


class Rng:
    def __init__(self, seed: int):
        self.a = seed & M32
        self._cum: dict[int, list[float]] = {}

    def next(self) -> float:
        self.a = (self.a + 0x6D2B79F5) & M32
        t = self.a
        t = _imul(t ^ (t >> 15), t | 1)
        t = (t ^ ((t + _imul(t ^ (t >> 7), t | 61)) & M32)) & M32
        return ((t ^ (t >> 14)) & M32) / 4294967296

    def between(self, lo: float, hi: float) -> float:
        return lo + (hi - lo) * self.next()

    def int(self, lo: int, hi: int) -> int:
        return math.floor(self.between(lo, hi + 1))

    def pick(self, arr: Sequence[T]) -> T:
        return arr[math.floor(self.next() * len(arr))]

    def weighted(self, pairs: Sequence[tuple[str, float]]) -> str:
        key = id(pairs)
        cum = self._cum.get(key)
        if cum is None:
            acc = 0.0
            cum = []
            for _, w in pairs:
                acc += w
                cum.append(acc)
            self._cum[key] = cum
        r = self.next() * cum[-1]
        i = bisect_left(cum, r)  # first index with cum[i] >= r, as in the TS binary search
        return pairs[min(i, len(pairs) - 1)][0]

    def normal(self, mean: float = 0.0, sd: float = 1.0) -> float:
        u = max(self.next(), 1e-9)
        v = self.next()
        return mean + sd * math.sqrt(-2 * math.log(u)) * math.cos(2 * math.pi * v)
