import { readFileSync, writeFileSync } from "node:fs";

const WIKI = "https://darkanddarker.wiki.spellsandguns.com";
const UA = { "User-Agent": "darker-tweaks/0.1 (data sync)" };
const CLASSES = [
  "Bard",
  "Barbarian",
  "Fighter",
  "Cleric",
  "Sorcerer",
  "Rogue",
  "Druid",
  "Warlock",
  "Wizard",
  "Ranger",
];
const RARITIES = ["Poor", "Common", "Uncommon", "Rare", "Epic", "Legendary", "Unique"];

interface Source {
  id: string;
  label: string;
  group: string;
  kind: string;
  school: "magical";
  baseDamage: number;
  scaling: number;
}

async function wikitext(page: string): Promise<{ text: string; revid: number }> {
  const url = `${WIKI}/api.php?action=parse&page=${encodeURIComponent(page)}&prop=wikitext|revid&format=json&formatversion=2`;
  const res = (await (await fetch(url, { headers: UA })).json()) as {
    parse: { wikitext: string; revid: number };
  };
  return { text: res.parse.wikitext, revid: res.parse.revid };
}

async function raw(page: string): Promise<{ text: string; revid: number }> {
  const text = await (
    await fetch(`${WIKI}/index.php?title=${encodeURIComponent(page)}&action=raw`, { headers: UA })
  ).text();
  const q = `${WIKI}/api.php?action=query&prop=revisions&titles=${encodeURIComponent(page)}&rvprop=ids&format=json&formatversion=2`;
  const meta = (await (await fetch(q, { headers: UA })).json()) as {
    query: { pages: { revisions: { revid: number }[] }[] };
  };
  return { text, revid: meta.query.pages[0]!.revisions[0]!.revid };
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const splitCamel = (s: string) =>
  s
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b(Of|The|And)\b/g, (w) => w.toLowerCase())
    .replace(/^./, (c) => c.toUpperCase());

const PART_TOKENS = [
  "lavaelemental",
  "firemastery",
  "cursemastery",
  "lightning",
  "splash",
  "radius",
  "damage",
  "finale",
  "bounce",
  "burning",
  "arrow",
  "aura",
  "burn",
  "dark",
  "fire",
  "hit",
  "aoe",
  "dot",
  "ice",
];
const PART_WORDS: Record<string, string> = {
  lavaelemental: "lava elemental",
  firemastery: "(Fire Mastery)",
  cursemastery: "(Curse Mastery)",
  burning: "burn",
  aoe: "AoE",
  dot: "DoT",
  damage: "",
};

function partLabel(prefix: string): string {
  const words: string[] = [];
  let rest = prefix;
  while (rest.length) {
    const num = /^\d+/.exec(rest);
    if (num) {
      words.push(num[0]);
      rest = rest.slice(num[0].length);
      continue;
    }
    const token = PART_TOKENS.find((t) => rest.startsWith(t));
    if (!token) return prefix;
    words.push(PART_WORDS[token] ?? token);
    rest = rest.slice(token.length);
  }
  return words.filter(Boolean).join(" ");
}

const leadingNumbers = (v: string) =>
  (/^<b>\s*([\d.]+(?:\/[\d.]+)*)/.exec(v)?.[1] ?? "").split("/").filter(Boolean);

function scalingFor(fields: Map<string, string>, prefix: string): string[] | undefined {
  const direct = fields.get(`${prefix}scaling`);
  const fallback = ["enemyscaling", "hitscaling", "hitundeadscaling", "undeadscaling"]
    .map((k) => fields.get(k))
    .find(Boolean);
  const v = direct ?? (prefix === "" ? fallback : undefined);
  if (!v) return undefined;
  return (/^<b>\s*([\d.]+%(?:\/[\d.]+%)*)/.exec(v)?.[1] ?? "").split("/").filter(Boolean);
}

async function abilityNames(): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  for (const cls of CLASSES) {
    const { text } = await wikitext(cls);
    for (const m of text.matchAll(/\{\{Ability[_ ]Data\|([A-Za-z0-9']+)\|/g)) {
      names.set(m[1]!.toLowerCase().replace(/'/g, ""), splitCamel(m[1]!.replace(/'/g, "")));
    }
  }
  return names;
}

async function abilitySources(): Promise<{ sources: Source[]; skipped: string[]; revid: number }> {
  const { text, revid } = await wikitext("Template:Ability Data");
  const names = await abilityNames();
  const sources: Source[] = [];
  const skipped: string[] = [];
  let cls = "";
  let kind = "";
  let ability: string | undefined;
  let fields = new Map<string, string>();

  const flush = () => {
    if (!ability) return;
    const name = names.get(ability) ?? splitCamel(ability);
    for (const [key, value] of fields) {
      if (!key.endsWith("magicalbasedamage")) continue;
      const prefix = key.slice(0, -"magicalbasedamage".length);
      if (prefix.startsWith("true") || prefix.startsWith("desc")) continue;
      const damages = leadingNumbers(value);
      const scalings = scalingFor(fields, prefix);
      if (!damages.length || !scalings?.length) {
        skipped.push(`${cls}/${ability}/${prefix || "-"}`);
        continue;
      }
      const part = partLabel(prefix);
      damages.forEach((d, i) => {
        const tier = damages.length > 1 ? ` tier ${i + 1}` : "";
        const label = `${name}${part ? ` — ${part}` : ""}${tier}`;
        sources.push({
          id: slug(`${cls}-${ability}-${prefix}${tier}`),
          label,
          group: cls,
          kind: kind.toLowerCase(),
          school: "magical",
          baseDamage: Number(d),
          scaling: Number((scalings[Math.min(i, scalings.length - 1)] ?? "").replace("%", "")) / 100,
        });
      });
    }
  };

  for (const line of text.split("\n")) {
    const section = /<!-- Class=(\w+)(?:, Category=(\w+))? -->/.exec(line);
    if (section) {
      flush();
      ability = undefined;
      fields = new Map();
      cls = section[1]!;
      kind = section[2] ?? "";
      continue;
    }
    const start = /^\|([a-z0-9]+)=\{\{#switch/.exec(line);
    if (start) {
      flush();
      ability = start[1]!;
      fields = new Map();
      continue;
    }
    const field = /^\s+\|([a-z0-9]+)=(.*)$/.exec(line);
    if (field && ability) fields.set(field[1]!, field[2]!);
  }
  flush();
  return { sources, skipped, revid };
}

type Json = { [k: string]: Json } | Json[] | string | number | boolean | null;

async function weaponSources(): Promise<{ sources: Source[]; revid: number }> {
  const { text, revid } = await raw("Data:Weapon.json");
  const weapons = (
    JSON.parse(text) as { Weapon: Record<string, { stats?: Record<string, Json>; abilities?: Json }> }
  ).Weapon;
  const sources: Source[] = [];
  for (const [name, w] of Object.entries(weapons)) {
    const base = w.stats?.["magical base weapon damage"];
    if (Array.isArray(base)) {
      base.forEach((d, i) =>
        sources.push({
          id: slug(`weapon-${name}-${RARITIES[i]}`),
          label: `${name} (${RARITIES[i]}) — attack`,
          group: "Weapons",
          kind: "weapon",
          school: "magical",
          baseDamage: Number(d),
          scaling: 1,
        }),
      );
    } else if (typeof base === "string") {
      sources.push({
        id: slug(`weapon-${name}`),
        label: `${name} — attack`,
        group: "Weapons",
        kind: "weapon",
        school: "magical",
        baseDamage: Number(base),
        scaling: 1,
      });
    }
    const visit = (o: Json, path: string[]) => {
      if (!o || typeof o !== "object" || Array.isArray(o)) return;
      const dmg = o["Magical Base Damage"];
      if (typeof dmg === "string") {
        const effect = path.at(-3) ?? "effect";
        const scaling = typeof o["Scaling"] === "string" ? Number(o["Scaling"].replace("%", "")) / 100 : 1;
        sources.push({
          id: slug(`weapon-${name}-${effect}`),
          label: `${name} — ${splitCamel(effect)
            .replace(/^(Unique|Artifact) /, "")
            .toLowerCase()}`,
          group: "Weapons",
          kind: "weapon",
          school: "magical",
          baseDamage: Number(dmg),
          scaling,
        });
      }
      for (const [k, v] of Object.entries(o)) visit(v, [...path, k]);
    };
    visit(w.abilities ?? null, []);
  }
  return { sources, revid };
}

const snapshotPath = process.argv[2];
if (!snapshotPath) throw new Error("usage: node scripts/sync-sources.ts <snapshot.json>");

const abilities = await abilitySources();
const weapons = await weaponSources();
const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8")) as {
  snapshot: { revisions: Record<string, number> };
  sources: Source[];
};
const all = [...abilities.sources, ...weapons.sources];
const dupes = all.filter((s, i) => all.findIndex((o) => o.id === s.id) !== i).map((s) => s.id);
if (dupes.length) throw new Error(`duplicate ids: ${dupes.join(", ")}`);

snapshot.sources = all;
snapshot.snapshot.revisions["Template:Ability Data"] = abilities.revid;
snapshot.snapshot.revisions["Data:Weapon.json"] = weapons.revid;
writeFileSync(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`);

console.log(`abilities: ${abilities.sources.length}, weapons: ${weapons.sources.length}`);
console.log(`skipped (no damage number or scaling): ${abilities.skipped.join(", ") || "none"}`);
