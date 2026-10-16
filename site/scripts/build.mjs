#!/usr/bin/env node
// Build: Vite client bundle -> SSR prerender of every route -> per-route meta, sitemap and
// robots -> release-gate stamp.
//
// While any owner fact is unconfirmed (see scripts/release-gate.mjs) the output is a LOCAL
// build: every page is noindex,nofollow, robots.txt disallows all, no sitemap is written, and
// .release-status.json records publishable:false. `npm run release:check` (strict) then
// refuses to publish. `node scripts/build.mjs --release` fails outright in that state unless
// SITE_ALLOW_UNCONFIRMED_FACTS=true is set locally.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "vite";
import { evaluateRelease, previewNoindex } from "./release-gate.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const ssrOut = path.join(root, ".ssr");
const releaseMode = process.argv.includes("--release");

const gate = await evaluateRelease();
if (releaseMode && !gate.allowed) {
  process.stderr.write(`Release build refused: ${gate.items.length} unconfirmed item(s). Run npm run release:check for the list.\n`);
  process.exit(1);
}

await build({ root, logLevel: "warn" });
await build({ root, logLevel: "warn", build: { ssr: "src/entry-server.jsx", outDir: ".ssr", emptyOutDir: true, copyPublicDir: false } });

const server = await import(pathToFileURL(path.join(ssrOut, "entry-server.js")).href);
const siteConfig = (await import(pathToFileURL(path.join(root, "site.config.mjs")).href)).default;
// Until the production domain is chosen (SITE_PUBLIC_ORIGIN), canonical URLs use the local preview
// origin; such builds are blocked from publishing and fully noindexed by the release gate.
const origin = (siteConfig.site.origin ?? "http://127.0.0.1:4391").replace(/\/$/, "");
const brand = siteConfig.brand.name.value;
// Preview hosts (SITE_NOINDEX=true or any *.workers.dev origin) are never indexed, even when the
// release gate passes; only the production domain gets index,follow, a sitemap and Allow.
const previewHost = previewNoindex(origin);
const blocked = !gate.publishable || previewHost;

const esc = (v) => String(v).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const businessSchema = {
  "@context": "https://schema.org",
  "@type": "HVACBusiness",
  "@id": `${origin}/#business`,
  name: brand,
  url: `${origin}/`,
  telephone: siteConfig.contact.mainPhone.value,
  logo: `${origin}/assets/css-logo-transparent.png`,
  address: { "@type": "PostalAddress", addressLocality: siteConfig.site.location.city, addressRegion: siteConfig.site.location.state, addressCountry: "US" },
  areaServed: [{ "@type": "City", name: "Dawsonville, GA" }],
  // No openingHours (unconfirmed), ratings, reviews, prices or licensing claims.
};

const template = readFileSync(path.join(dist, "index.html"), "utf8");
for (const route of server.ROUTES) {
  const robots = blocked || route.noindex ? "noindex,nofollow" : "index,follow,max-image-preview:large";
  const head = [
    `<meta name="robots" content="${robots}">`,
    `<link rel="canonical" href="${esc(origin + route.path)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${esc(brand)}">`,
    `<meta property="og:title" content="${esc(route.title)}">`,
    `<meta property="og:description" content="${esc(route.description)}">`,
    `<meta property="og:url" content="${esc(origin + route.path)}">`,
    `<script type="application/ld+json">${JSON.stringify(businessSchema).replaceAll("<", "\\u003c")}</script>`,
  ].join("\n    ");
  const html = template
    .replace(/<title>.*?<\/title>/s, `<title>${esc(route.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${esc(route.description)}">`)
    .replace("</head>", `    ${head}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${server.render(route.path)}</div>`);
  const out = route.path === "/" ? path.join(dist, "index.html") : path.join(dist, ...route.path.split("/").filter(Boolean), "index.html");
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, html, "utf8");
}

if (blocked) {
  writeFileSync(path.join(dist, "robots.txt"), `# ${previewHost && gate.publishable ? "Preview host" : "Local build: owner facts unconfirmed"}. Not for indexing.\nUser-agent: *\nDisallow: /\n`, "utf8");
  rmSync(path.join(dist, "sitemap.xml"), { force: true });
} else {
  const urls = server.ROUTES.filter((r) => !r.noindex).map((r) => `  <url><loc>${esc(origin + r.path)}</loc></url>`).join("\n");
  writeFileSync(path.join(dist, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, "utf8");
  writeFileSync(path.join(dist, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`, "utf8");
}
// Release status lives OUTSIDE dist/ so internal notes are never served.
writeFileSync(
  path.join(root, ".release-status.json"),
  `${JSON.stringify({ builtAt: new Date().toISOString(), origin, publishable: gate.publishable, previewNoindex: previewHost, override: gate.override, unconfirmed: gate.items.map((i) => i.path), labeledDrafts: gate.drafts.map((d) => d.path) }, null, 2)}\n`,
);
rmSync(ssrOut, { recursive: true, force: true });

process.stdout.write(`Built ${server.ROUTES.length} prerendered routes + /privacy/.\n`);
if (gate.publishable && previewHost)
  process.stdout.write(`Preview build for ${origin}: publishable, but every page is noindex and robots.txt disallows crawling.\n`);
else if (blocked)
  process.stderr.write(
    `LOCAL BUILD ONLY — not publishable: ${gate.items.length} unconfirmed item(s) (${gate.items.map((i) => i.path).join(", ")}). Pages are noindex; npm run release:check will refuse.\n`,
  );
