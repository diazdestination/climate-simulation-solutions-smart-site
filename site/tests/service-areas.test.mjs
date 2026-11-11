import assert from "node:assert/strict";
import test from "node:test";
import { ensureBuilt, read } from "./helpers.mjs";
import { ROUTES, routeFor } from "../src/routes.js";
import { HOME_BASE, MAP_TOWNS, milesFromBase } from "../src/content/area-map.js";
import { AREA_PAGES, HELD_AREA_PAGES, SERVED_COMMUNITIES, areaPath } from "../src/content/pages.js";

const text = (html) => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ").replaceAll("&#x27;", "'").replaceAll("&amp;", "&").replace(/\s+/g, " ");

test("every community served has its own page (Adam, 2026-11-11)", () => {
  assert.deepEqual(SERVED_COMMUNITIES, ["Dahlonega", "Cumming", "Gainesville", "Jasper", "Ball Ground", "Canton", "Buford", "Alpharetta", "Cleveland", "Roswell", "Johns Creek", "Atlanta"]);
  assert.equal(AREA_PAGES.length, 13, "Dawsonville plus twelve");
  assert.equal(AREA_PAGES.filter((p) => p.isBase).length, 1);
  for (const town of [HOME_BASE, ...MAP_TOWNS]) {
    const route = routeFor(areaPath(town.slug));
    assert.ok(route, `${town.name} has a route`);
    assert.equal(route.page, "area");
    assert.ok(route.title.includes(`${town.name}, GA`));
    assert.ok(route.description.length <= 160, `${town.name} description fits a search result`);
  }
  for (const key of ["title", "description", "path"]) assert.equal(new Set(ROUTES.map((r) => r[key])).size, ROUTES.length, `no two pages share a ${key}`);
  assert.deepEqual(HELD_AREA_PAGES.map((p) => p.city), ["Forsyth"], "only the unconfirmed 'Forsyth' request stays held");
});

test("built town pages: true, town-specific and free of promises nobody approved", () => {
  ensureBuilt();
  for (const page of AREA_PAGES) {
    const { town } = page;
    const html = read("dist", "service-areas", town.slug, "index.html");
    const visible = text(html);
    assert.match(html, new RegExp(`<h1>[^<]*${town.name}\\.</h1>`), `${town.name}: headline names the town`);
    assert.ok(visible.includes(town.county), `${town.name}: county shown`);
    assert.ok(visible.includes(town.place), `${town.name}: place line shown`);
    assert.ok(html.includes(`<link rel="canonical" href="https://csshvac.com/service-areas/${town.slug}/">`));
    assert.match(html, /name="robots" content="index,follow/);
    assert.match(html, /href="tel:\+17065020877"/);
    assert.match(html, /href="\/book-service\/"/);
    assert.match(html, /href="\/urgent\/"/);
    for (const slug of ["emergency-hvac-repair", "hvac-maintenance"]) assert.ok(html.includes(`href="/services/${slug}/"`), `${town.name}: links to services`);
    assert.match(html, /href="\/service-areas\/"/);
    if (!page.isBase) {
      const miles = Math.round(milesFromBase(town));
      assert.ok(visible.includes(`serves homes and businesses in ${town.name}, about ${miles} miles from our base in Dawsonville.`));
      assert.match(html, /class="area-map area-map--focus"/, `${town.name}: map picks the town out`);
      assert.ok(html.includes(`${town.name} is about ${miles} miles from Dawsonville in a straight line.`));
      assert.ok(visible.includes(`Do you serve ${town.name}?`) && visible.includes(`Yes. Climate Simulation Solutions serves homes and businesses in ${town.name}.`));
    }
    // Being served is now stated plainly; speed, round-the-clock cover and price still are not.
    assert.doesNotMatch(visible, /call to check|check availability|not a promise of service/i, `${town.name}: no leftover hedging`);
    assert.doesNotMatch(visible, /24\/7|24-hour|same.day|within \d+ (minutes|hours)|fast(est)? response|guarantee|free estimate|\$\d|financing|#1|best in|award/i, `${town.name}: no unapproved claims`);
    assert.match(visible, /response depends on availability and location/);
  }
});

test("service-area index and homepage list every town and link to its page", () => {
  ensureBuilt();
  const index = read("dist", "service-areas", "index.html");
  const home = read("dist", "index.html");
  assert.match(index, /<h1>Serving North Georgia from Dawsonville\.<\/h1>/);
  assert.match(index, /Communities we serve\./);
  assert.match(home, /Based in Dawsonville\. Serving North Georgia and metro Atlanta\./);
  for (const town of MAP_TOWNS) {
    for (const [name, html] of [["index", index], ["home", home]]) assert.ok(html.includes(`href="/service-areas/${town.slug}/"`), `${name} links to ${town.name}`);
    assert.ok(index.includes(`${Math.round(milesFromBase(town))} mi`));
  }
  assert.ok(index.includes('href="/service-areas/dawsonville-ga/"'));
  for (const html of [index, home]) assert.doesNotMatch(text(html), /call to check|Building a wider reach|not a promise of service/i);
  const sitemap = read("dist", "sitemap.xml");
  assert.equal(sitemap.match(/<loc>/g).length, 24, "11 site pages plus 13 community pages");
  for (const page of AREA_PAGES) assert.ok(sitemap.includes(`https://csshvac.com/service-areas/${page.slug}/`));
  assert.match(read("dist", "llms.txt"), /serving Dahlonega, Cumming, Gainesville, Jasper, Ball Ground, Canton, Buford, Alpharetta, Cleveland, Roswell, Johns Creek and Atlanta\./);
});
