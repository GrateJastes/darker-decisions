import { mitigationMultiplier } from "./mitigation";

export interface Offense {
  baseDamage: number;
  scaling: number;
  powerBonus: number;
  gearDamage?: number;
  additionalDamage?: number;
  buffWeaponDamage?: number;
  comboMultiplier?: number;
  impactZoneMultiplier?: number;
  divineStrikeDamage?: number;
  penetration?: number;
  trueDamage?: number;
}

export interface Defense {
  damageReduction: number;
  damageReductionMod?: number;
  hitLocationBonus?: number;
}

export interface Rules {
  penetrationCap: number;
}

export function scaledDamage(o: Offense): number {
  const s = o.scaling;
  const weapon =
    (o.baseDamage + (o.buffWeaponDamage ?? 0)) * (o.comboMultiplier ?? 1) * (o.impactZoneMultiplier ?? 1);
  const flat = ((o.gearDamage ?? 0) + (o.divineStrikeDamage ?? 0)) * s;
  return (weapon + flat) * (1 + o.powerBonus * s);
}

export function afterAdditional(o: Offense): number {
  return scaledDamage(o) + (o.additionalDamage ?? 0) * o.scaling;
}

export function afterHitLocation(o: Offense, d: Defense): number {
  return afterAdditional(o) * (1 + (d.hitLocationBonus ?? 0));
}

export function afterMitigation(o: Offense, d: Defense, rules: Rules): number {
  return (
    afterHitLocation(o, d) *
    mitigationMultiplier({
      damageReduction: d.damageReduction,
      damageReductionMod: d.damageReductionMod ?? 0,
      penetration: o.penetration ?? 0,
      penetrationCap: rules.penetrationCap,
    })
  );
}

export function damage(o: Offense, d: Defense, rules: Rules): number {
  return afterMitigation(o, d, rules) + (o.trueDamage ?? 0) * o.scaling;
}
