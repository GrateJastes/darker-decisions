import { mrVsMdr } from "@models/mr-vs-mdr/model";
import type { FeatureEntry } from "../_generic/feature";
import { GenericCalculatorView } from "../_generic/GenericCalculatorView";

export const mrVsMdrFeature: FeatureEntry = {
  slug: "mr-vs-mdr",
  title: mrVsMdr.title,
  blurb: mrVsMdr.question,
  View: () => <GenericCalculatorView model={mrVsMdr} />,
};
