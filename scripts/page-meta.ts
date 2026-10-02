import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createServer, type AliasOptions, type Plugin } from "vite";

export const SITE_URL = "https://darker-decisions.com";
const SITE_NAME = "Darker Decisions";

export interface PageMeta {
  path: string;
  title: string;
  description: string;
}

interface FeatureLike {
  slug: string;
  title: string;
  blurb: string;
}

const escapeAttr = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function withMeta(html: string, meta: PageMeta): string {
  const url = `${SITE_URL}${meta.path}`;
  const setContent = (attr: "name" | "property", key: string, value: string) => (doc: string) =>
    doc.replace(
      new RegExp(`(<meta ${attr}="${key}" content=")[^"]*(")`),
      (_, open: string, close: string) => `${open}${escapeAttr(value)}${close}`,
    );
  return [
    (doc: string) => doc.replace(/<title>[^<]*<\/title>/, `<title>${escapeAttr(meta.title)}</title>`),
    setContent("name", "description", meta.description),
    setContent("property", "og:title", meta.title),
    setContent("property", "og:description", meta.description),
    setContent("property", "og:url", url),
    setContent("name", "twitter:title", meta.title),
    setContent("name", "twitter:description", meta.description),
    (doc: string) => doc.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`),
  ].reduce((doc, apply) => apply(doc), html);
}

export function pageMeta(alias: AliasOptions): Plugin {
  let outDir = "";
  let root = "";
  return {
    name: "page-meta",
    apply: "build",
    configResolved(config) {
      root = config.root;
      outDir = resolve(config.root, config.build.outDir);
    },
    async closeBundle() {
      const server = await createServer({
        root,
        configFile: false,
        resolve: { alias },
        server: { middlewareMode: true, hmr: false },
        appType: "custom",
        logLevel: "silent",
      });
      try {
        const { features } = (await server.ssrLoadModule("/src/app/registry.ts")) as {
          features: readonly FeatureLike[];
        };
        const html = await readFile(join(outDir, "index.html"), "utf8");
        for (const f of features) {
          const dir = join(outDir, f.slug);
          await mkdir(dir, { recursive: true });
          await writeFile(
            join(dir, "index.html"),
            withMeta(html, { path: `/${f.slug}`, title: `${f.title} · ${SITE_NAME}`, description: f.blurb }),
          );
        }
      } finally {
        await server.close();
      }
    },
  };
}
