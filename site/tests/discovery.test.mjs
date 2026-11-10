import assert from "node:assert/strict";
import test from "node:test";
import { ROUTES } from "../src/routes.js";
import { HOME_FAQ } from "../src/content/home-faqs.js";
import { graphFor, llmsText } from "../scripts/discovery.mjs";
import config from "../site.config.mjs";
import { ensureBuilt, read } from "./helpers.mjs";

test("all public pages carry linked entities and FAQs from their visible source", () => {
  const cfg = { ...config, site: { ...config.site, origin: "https://csshvac.com" } };
  for (const route of ROUTES) {
    const { "@graph": graph } = graphFor(route, cfg, HOME_FAQ);
    const byType = type => graph.find(n => n["@type"] === type);
    assert.equal(byType("WebPage").url, cfg.site.origin + route.path);
    assert.equal(byType("WebSite").publisher["@id"], byType("HVACBusiness")["@id"]);
    assert.equal(Boolean(byType("BreadcrumbList")), !route.noindex && route.path !== "/");
    assert.equal(Boolean(byType("Service")), route.path.startsWith("/services/"));
    const expected = route.noindex ? undefined : route.path === "/" ? HOME_FAQ : route.content?.questions;
    assert.deepEqual(byType("FAQPage")?.mainEntity.map(q => [q.name, q.acceptedAnswer.text]), expected);
    assert.doesNotMatch(JSON.stringify(graph), /aggregateRating|reviewRating|priceCurrency|streetAddress|openingHours/);
  }
  const guide = llmsText(ROUTES, cfg);
  assert.doesNotMatch(guide, /\]\([^)]*\/(assistant|privacy|api)\//);
  for (const route of ROUTES.filter(r => !r.noindex)) assert.ok(guide.includes(`](${cfg.site.origin}${route.path})`));
});

test("built metadata and graph match each prerendered page, with public guide", () => {
  ensureBuilt();
  for (const route of ROUTES) {
    const html = read("dist", ...route.path.split("/").filter(Boolean), "index.html");
    const data = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)];
    assert.equal(data.length, 1, route.path);
    const graph = JSON.parse(data[0][1])["@graph"];
    assert.ok(graph.some(n => n["@type"] === "WebPage" && n.url === `https://csshvac.com${route.path}`));
    assert.match(html, /name="twitter:card" content="summary"/);
    assert.match(html, /property="og:image" content="https:\/\/csshvac.com\/assets\/css-logo-transparent.png"/);
    for (const faq of graph.filter(n => n["@type"] === "FAQPage")) {
      const plain = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "").replaceAll("&amp;", "&").replaceAll("&#x27;", "'").replaceAll("&quot;", '"').replaceAll("<!-- -->", "");
      for (const q of faq.mainEntity) {
        assert.ok(plain.includes(q.name), `${route.path}: visible question`);
        assert.ok(plain.includes(q.acceptedAnswer.text), `${route.path}: visible answer`);
      }
    }
  }
  assert.match(read("dist", "llms.txt"), /Online requests are not confirmed appointments/);
});
