import { ppbVsArmorpen } from "@models/ppb-vs-armorpen/model";
import type { FeatureEntry } from "../_generic/feature";
import { GenericCalculatorView } from "../_generic/GenericCalculatorView";

export const ppbVsArmorpenFeature: FeatureEntry = {
  slug: "ppb-vs-armorpen",
  title: ppbVsArmorpen.title,
  blurb: ppbVsArmorpen.question,
  View: () => <GenericCalculatorView model={ppbVsArmorpen} />,
};
