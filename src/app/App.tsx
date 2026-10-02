import { useEffect } from "react";
import { features } from "./registry";
import { Landing } from "./Landing";
import { NotFound } from "./NotFound";
import { usePath } from "./router";
import { Shell } from "./Shell";

const SITE_NAME = "Darker Decisions";

export function App() {
  const path = usePath().replace(/\/$/, "");
  const feature = features.find((f) => `/${f.slug}` === path);
  const missing = !feature && path !== "";

  useEffect(() => {
    document.title = feature
      ? `${feature.title} · ${SITE_NAME}`
      : missing
        ? `Not found · ${SITE_NAME}`
        : SITE_NAME;
  }, [feature, missing]);

  return (
    <Shell>
      {feature ? <feature.View key={feature.slug} /> : missing ? <NotFound path={path} /> : <Landing />}
    </Shell>
  );
}
