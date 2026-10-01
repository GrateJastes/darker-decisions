export interface Point {
  x: number;
  y: number;
}

export function range(min: number, max: number, steps: number): number[] {
  return Array.from({ length: steps + 1 }, (_, i) => min + ((max - min) * i) / steps);
}

export function sweep(xs: readonly number[], f: (x: number) => number): Point[] {
  return xs.map((x) => ({ x, y: f(x) }));
}

export function marginalGain(f: (x: number) => number, x: number, step: number): number {
  return f(x + step) - f(x);
}

function bisect(f: (x: number) => number, lo: number, hi: number, iterations = 50): number {
  let a = lo;
  let b = hi;
  const sa = Math.sign(f(a));
  for (let i = 0; i < iterations; i++) {
    const m = (a + b) / 2;
    if (Math.sign(f(m)) === sa) a = m;
    else b = m;
  }
  return (a + b) / 2;
}

export function findCrossings(xs: readonly number[], f: (x: number) => number, level = 0): number[] {
  const g = (x: number) => f(x) - level;
  const out: number[] = [];
  for (let i = 1; i < xs.length; i++) {
    const a = xs[i - 1]!;
    const b = xs[i]!;
    const ga = g(a);
    const gb = g(b);
    if (ga === 0) out.push(a);
    else if (Math.sign(ga) !== Math.sign(gb) && gb !== 0) out.push(bisect(g, a, b));
  }
  const last = xs[xs.length - 1];
  if (last !== undefined && g(last) === 0) out.push(last);
  return out;
}

export function crossover(
  xs: readonly number[],
  f: (x: number) => number,
  g: (x: number) => number,
): number[] {
  return findCrossings(xs, (x) => f(x) - g(x));
}

export function solveMonotone(
  f: (x: number) => number,
  target: number,
  lo: number,
  hi: number,
  iterations = 40,
): number | undefined {
  if (f(lo) >= target) return lo;
  if (f(hi) < target) return undefined;
  let a = lo;
  let b = hi;
  for (let i = 0; i < iterations; i++) {
    const m = (a + b) / 2;
    if (f(m) >= target) b = m;
    else a = m;
  }
  return b;
}
