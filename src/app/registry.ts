import type { FeatureCategory, FeatureEntry } from "@features/_generic/feature";
import { arVsPdrFeature } from "@features/ar-vs-pdr/index";
import { headshotVsPpbFeature } from "@features/headshot-vs-ppb/index";
import { mdbVsMagpenFeature } from "@features/mdb-vs-magpen/index";
import { mrVsMdrFeature } from "@features/mr-vs-mdr/index";
import { ppbVsArmorpenFeature } from "@features/ppb-vs-armorpen/index";

export const features: readonly FeatureEntry[] = [
  mdbVsMagpenFeature,
  ppbVsArmorpenFeature,
  headshotVsPpbFeature,
  arVsPdrFeature,
  mrVsMdrFeature,
];

export const categories: readonly { id: FeatureCategory; title: string; blurb: string }[] = [
  {
    id: "offense",
    title: "Damage",
    blurb: "Power bonus, penetration and headshots: which stat hits harder next.",
  },
  {
    id: "defense",
    title: "Defense",
    blurb: "Armor, magic resistance and the damage-reduction caps they run into.",
  },
];
