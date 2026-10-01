import type { ComponentType } from "react";

export interface FeatureEntry {
  slug: string;
  title: string;
  blurb: string;
  View: ComponentType;
}
