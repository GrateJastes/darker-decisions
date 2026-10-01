import type { FeatureEntry } from "@features/_generic/feature";
import { arVsPdrFeature } from "@features/ar-vs-pdr/index";
import { mdbVsMagpenFeature } from "@features/mdb-vs-magpen/index";

export const features: readonly FeatureEntry[] = [mdbVsMagpenFeature, arVsPdrFeature];
