import { headshotVsPpb } from "@models/headshot-vs-ppb/model";
import type { FeatureEntry } from "../_generic/feature";
import { GenericCalculatorView } from "../_generic/GenericCalculatorView";

export const headshotVsPpbFeature: FeatureEntry = {
  slug: "headshot-vs-ppb",
  title: headshotVsPpb.title,
  blurb: headshotVsPpb.question,
  View: () => <GenericCalculatorView model={headshotVsPpb} />,
};
