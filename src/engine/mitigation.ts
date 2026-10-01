import { evaluate, type CurvePoints } from "./curve";

export interface DamageReductionInput {
  curve: CurvePoints;
  rating: number;
  bonus?: number;
  cap: number;
}

export function damageReduction({ curve, rating, bonus = 0, cap }: DamageReductionInput): number {
  return Math.min(evaluate(curve, rating) + bonus, cap);
}

export interface MitigationInput {
  damageReduction: number;
  damageReductionMod?: number;
  penetration: number;
  penetrationCap: number;
}

export function mitigationMultiplier({
  damageReduction: dr,
  damageReductionMod = 0,
  penetration,
  penetrationCap,
}: MitigationInput): number {
  const modified = dr * (1 + damageReductionMod);
  const pen = Math.min(Math.max(penetration, 0), penetrationCap);
  return Math.max(1 - modified * (1 - pen), 1 - modified);
}
