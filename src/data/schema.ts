import { z } from "zod";

const point = z.tuple([z.number(), z.number()]);

export const curveSchema = z
  .array(point)
  .min(2)
  .refine(
    (pts) => pts.every((p, i) => i === 0 || p[0] > pts[i - 1]![0]),
    "curve x values must be strictly increasing",
  );

const damageSchool = z.enum(["magical", "physical"]);

export const damageSourceSchema = z.object({
  id: z.string(),
  label: z.string(),
  group: z.string(),
  kind: z.string(),
  school: damageSchool,
  baseDamage: z.number(),
  scaling: z.number().min(0),
});

export const targetSchema = z.object({
  id: z.string(),
  label: z.string(),
  physicalDamageReduction: z.number(),
  magicalDamageReduction: z.number(),
});

export const gameDataSchema = z.object({
  snapshot: z.object({
    id: z.string(),
    retrieved: z.string(),
    source: z.string().url(),
    revisions: z.record(z.string(), z.number()),
  }),
  curves: z.object({
    armorRatingToPdr: curveSchema,
    magicResistanceToMdr: curveSchema,
    willToMagicResistance: curveSchema,
    powerToPowerBonus: curveSchema,
  }),
  caps: z.object({
    damageReduction: z.number(),
    damageReductionRaised: z.number(),
    penetration: z.number(),
  }),
  perks: z.object({
    defenseMastery: z.object({
      itemArmorRatingBonus: z.number(),
      maxPhysicalDamageReduction: z.number(),
    }),
  }),
  sources: z.array(damageSourceSchema).min(1),
  targets: z.array(targetSchema).min(1),
});

export type Curve = z.infer<typeof curveSchema>;
export type DamageSchool = z.infer<typeof damageSchool>;
export type DamageSource = z.infer<typeof damageSourceSchema>;
export type Target = z.infer<typeof targetSchema>;
export type GameData = z.infer<typeof gameDataSchema>;
