import { features } from "./registry";
import { Landing } from "./Landing";
import { usePath } from "./router";
import { Shell } from "./Shell";

export function App() {
  const path = usePath();
  const feature = features.find((f) => `/${f.slug}` === path.replace(/\/$/, ""));
  return <Shell>{feature ? <feature.View key={feature.slug} /> : <Landing />}</Shell>;
}
