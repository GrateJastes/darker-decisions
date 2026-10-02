import { arVsPdr } from "@models/ar-vs-pdr/model";
import type { FeatureEntry } from "../_generic/feature";
import { GenericCalculatorView } from "../_generic/GenericCalculatorView";

export const arVsPdrFeature: FeatureEntry = {
  slug: "ar-vs-pdr",
  title: arVsPdr.title,
  blurb: arVsPdr.question,
  category: "defense",
  View: () => <GenericCalculatorView model={arVsPdr} />,
};
