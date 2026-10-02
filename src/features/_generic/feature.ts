import type { ComponentType } from "react";

export type FeatureCategory = "offense" | "defense";

export interface FeatureEntry {
  slug: string;
  title: string;
  blurb: string;
  category: FeatureCategory;
  View: ComponentType;
}
