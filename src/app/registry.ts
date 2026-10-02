import type { FeatureEntry } from "@features/_generic/feature";
import { arVsPdrFeature } from "@features/ar-vs-pdr/index";
import { mdbVsMagpenFeature } from "@features/mdb-vs-magpen/index";
import { ppbVsArmorpenFeature } from "@features/ppb-vs-armorpen/index";

export const features: readonly FeatureEntry[] = [
  mdbVsMagpenFeature,
  ppbVsArmorpenFeature,
  arVsPdrFeature,
];
