export type CurvePoints = readonly (readonly [number, number])[];

function segmentIndex(curve: CurvePoints, x: number): number {
  let i = 0;
  while (i < curve.length - 2 && x >= curve[i + 1]![0]) i++;
  return i;
}

export function evaluate(curve: CurvePoints, x: number): number {
  const first = curve[0]!;
  const last = curve[curve.length - 1]!;
  if (x <= first[0]) return first[1];
  if (x >= last[0]) return last[1];
  const i = segmentIndex(curve, x);
  const [x0, y0] = curve[i]!;
  const [x1, y1] = curve[i + 1]!;
  return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
}

export function slope(curve: CurvePoints, x: number): number {
  const first = curve[0]!;
  const last = curve[curve.length - 1]!;
  if (x < first[0] || x >= last[0]) return 0;
  const i = segmentIndex(curve, x);
  const [x0, y0] = curve[i]!;
  const [x1, y1] = curve[i + 1]!;
  return (y1 - y0) / (x1 - x0);
}

export function inverse(curve: CurvePoints, y: number): number {
  const first = curve[0]!;
  const last = curve[curve.length - 1]!;
  if (y <= first[1]) return first[0];
  if (y >= last[1]) return last[0];
  for (let i = 0; i < curve.length - 1; i++) {
    const [x0, y0] = curve[i]!;
    const [x1, y1] = curve[i + 1]!;
    if (y >= y0 && y <= y1 && y1 !== y0) return x0 + ((x1 - x0) * (y - y0)) / (y1 - y0);
  }
  return last[0];
}
