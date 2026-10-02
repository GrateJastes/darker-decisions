import { mdbVsMagpen } from "@models/mdb-vs-magpen/model";
import type { FeatureEntry } from "../_generic/feature";
import { GenericCalculatorView } from "../_generic/GenericCalculatorView";

export const mdbVsMagpenFeature: FeatureEntry = {
  slug: "mdb-vs-magpen",
  title: mdbVsMagpen.title,
  blurb: mdbVsMagpen.question,
  category: "offense",
  View: () => <GenericCalculatorView model={mdbVsMagpen} />,
};
