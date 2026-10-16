// Browser QA with Turnstile configured: serves dist/ locally, mocks every /api/* response and the
// Turnstile renderer (single-use tokens, reset issues a new one), blocks external requests.
// Covers the service request form and the text-chat assistant (start gating + retry with a fresh
// token after a failed session request). No provider is contacted.
// Usage: npm run build && node scripts/qa-bot-check-flow.mjs
// Playwright: PLAYWRIGHT_PACKAGE_JSON (default C:/Forge/tools/shipping-kit/package.json).
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = path.join(root, "dist");
const require = createRequire(process.env.PLAYWRIGHT_PACKAGE_JSON || "C:/Forge/tools/shipping-kit/package.json");
const { chromium } = require("@playwright/test");
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".woff": "font/woff", ".woff2": "font/woff2" };

const server = createServer(async (req, res) => {
  try {
    let pathname = decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname);
    if (pathname.endsWith("/")) pathname += "index.html";
    const target = path.resolve(distRoot, `.${pathname}`);
    if (!target.startsWith(path.resolve(distRoot) + path.sep)) throw new Error("invalid_path");
    res.writeHead(200, { "content-type": types[path.extname(target)] || "application/octet-stream" });
    res.end(await readFile(target));
  } catch {
    res.writeHead(404);
    res.end("not_found");
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];

async function openPage(route, width, height, mobile, apiOverrides = {}) {
  const context = await browser.newContext({ viewport: { width, height }, isMobile: mobile, hasTouch: mobile });
  const page = await context.newPage();
  const posts = [];
  const sessionTokens = [];
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    window.__turnstileCalls = [];
    window.__turnstileResets = 0;
    window.__widgets = {};
    window.turnstile = {
      render(container, options) {
        window.__turnstileCalls.push({ action: options.action, connected: container.isConnected });
        const id = `qa-widget-${window.__turnstileCalls.length}`;
        window.__widgets[id] = { options, issued: 0 };
        queueMicrotask(() => options.callback(`qa-token-${options.action}`));
        return id;
      },
      remove() {},
      reset(id) {
        window.__turnstileResets += 1;
        const widget = window.__widgets[id];
        if (widget) setTimeout(() => widget.options.callback(`qa-token-${widget.options.action}-renewed-${++widget.issued}`), 50);
      },
    };
  });
  await page.route("**/*", async (r) => {
    const request = r.request();
    const url = new URL(request.url());
    if (url.origin !== origin) return r.abort();
    if (!url.pathname.startsWith("/api/")) return r.continue();
    const json = (status, body) => r.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (url.pathname === "/api/protection") return json(200, { ready: true, turnstileSiteKey: "qa-site-key" });
    if (url.pathname === "/api/elevenlabs/status") return json(200, { ready: true, localOnly: true, modes: { text: true, voice: false } });
    if (url.pathname === "/api/elevenlabs/session") {
      sessionTokens.push(request.headers()["x-bot-check"] || "");
      return json(502, { ready: false, code: "voice_session_unavailable" });
    }
    if (url.pathname === "/api/lead" && request.method() === "POST") {
      posts.push(JSON.parse(request.postData() || "{}"));
      return json(201, { ready: true, status: "saved", leadId: "dddddddd-1111-4111-8111-aaaaaaaaaaaa", reference: "cccccccc-1111-4111-8111-aaaaaaaaaaaa" });
    }
    if (url.pathname === "/api/lead") return json(200, { ready: true, mode: "growthos", ...(apiOverrides.leadStatus ?? {}) });
    return json(200, { ready: false, code: "qa_disabled" });
  });
  await page.goto(origin + route, { waitUntil: "networkidle" });
  return { context, page, posts, sessionTokens, errors };
}

try {
  for (const [name, width, height] of [["desktop", 1440, 1000], ["mobile", 390, 844]]) {
    const service = await openPage("/book-service/", width, height, name === "mobile");
    const form = service.page.locator("form.request-form").first();
    await form.getByRole("textbox", { name: "Your name" }).fill("QA Bot Check");
    await form.getByRole("textbox", { name: "Phone" }).fill("(706) 555-0100");
    await form.getByRole("textbox", { name: "Service address" }).fill("1 Test Way");
    await form.getByRole("textbox", { name: "City" }).fill("Dawsonville");
    await form.getByRole("textbox", { name: "ZIP" }).fill("30534");
    await form.locator("label.consent-check input[type=checkbox]").first().check();
    await service.page.waitForFunction(() => window.__turnstileCalls.some((call) => call.action === "request_service"));
    await form.getByRole("button", { name: /Send service request/ }).click();
    await service.page.waitForTimeout(800);
    assert.equal(service.posts.length, 1, "one service request POST");
    // 2026-10-16: on phones the short result panel rendered above the screen, so no reference was seen.
    await service.page.waitForTimeout(900);
    const panel = service.page.locator(".request-result").first();
    assert.match(await panel.innerText(), /Your reference/i);
    assert.match(await panel.innerText(), /What happens next/);
    const box = await panel.boundingBox();
    assert.ok(box && box.y >= 0 && box.y < height, `result panel on screen (${name}, y=${box?.y})`);
    assert.equal(service.posts[0].botCheck, "qa-token-request_service");
    assert.equal(service.posts[0].website, "");
    assert.deepEqual(service.errors, []);
    results.push({ viewport: name, flow: "book-service", posts: service.posts.length });
    await service.context.close();

    const chat = await openPage("/assistant/", width, height, name === "mobile");
    assert.equal(await chat.page.getByText("Talk it through").count(), 0, "voice option hidden for CSS");
    await chat.page.getByText("I understand I’m using an AI assistant and want to continue.").click();
    const start = chat.page.getByRole("button", { name: /Start a text chat/ });
    const enabled = () => chat.page.waitForFunction(() => {
      const button = [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Start a text chat"));
      return button && !button.disabled;
    });
    await enabled();
    await start.click();
    await chat.page.waitForFunction(() => window.__turnstileResets >= 1);
    await enabled();
    await start.click();
    await chat.page.waitForFunction(() => window.__turnstileResets >= 2);
    assert.equal(chat.sessionTokens.length, 2);
    assert.ok(chat.sessionTokens.every(Boolean));
    assert.notEqual(chat.sessionTokens[0], chat.sessionTokens[1], "retry used a fresh token");
    assert.deepEqual(chat.errors, []);
    results.push({ viewport: name, flow: "text-chat", textOnly: true, retryUsedFreshToken: true });
    await chat.context.close();
  }
  console.log(JSON.stringify({ mode: "local Chrome; /api and Turnstile mocked; external requests blocked", status: "passed", results }, null, 2));
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
