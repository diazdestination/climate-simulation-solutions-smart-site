import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import siteConfig from "./site.config.mjs";
import { assertSiteConfig } from "./core/config/schema.mjs";
import { createSmartSiteWorker } from "./core/worker/router.js";
import { toPublicConfig } from "./src/lib/publicConfig.js";

// Local preview bridge: /api/* on the Vite dev/preview server goes through the same core
// worker the Cloudflare entry uses. Env comes ONLY from the process environment (never from
// .env files - Vite's loadEnv is intentionally not used). With nothing set, GrowthOS answers
// 503 growthos_not_configured and voice reports not configured: the safe local default.
const ENV_NAMES = [
  "SMART_SITE_GROWTHOS_ENABLED",
  "GROWTHOS_API_ORIGIN",
  "GROWTHOS_SITE_ID",
  "GROWTHOS_SITE_SECRET",
  "SITE_PUBLIC_ORIGIN",
  "ELEVENLABS_API_KEY",
  "ELEVENLABS_AGENT_ID",
  "ELEVENLABS_VOICE_PUBLIC",
];

function smartSiteApi() {
  const worker = createSmartSiteWorker(assertSiteConfig(siteConfig));
  const env = Object.fromEntries(ENV_NAMES.filter((n) => process.env[n]).map((n) => [n, process.env[n]]));
  const middleware = async (req, res, next) => {
    const url = new URL(req.url, "http://127.0.0.1");
    if (!url.pathname.startsWith("/api/")) return next();
    const chunks = [];
    if (!["GET", "HEAD"].includes(req.method)) for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const request = new Request(`http://${req.headers.host || "127.0.0.1"}${req.url}`, {
      method: req.method,
      headers: req.headers,
      body: chunks.length ? Buffer.concat(chunks) : undefined,
    });
    const response = await worker.fetch(request, env);
    res.statusCode = response.status;
    response.headers.forEach((value, name) => res.setHeader(name, value));
    res.end(Buffer.from(await response.arrayBuffer()));
  };
  return {
    name: "css-smart-site-api",
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

// Replace src/lib/publicConfig.js with its precomputed JSON in every Vite build so the browser
// bundle carries only display-safe facts (no approver notes, [CONFIRM] markers or gates).
function publicConfigModule() {
  return {
    name: "css-public-config",
    enforce: "pre",
    load(id) {
      if (id.split("?")[0].replaceAll("\\", "/").endsWith("/src/lib/publicConfig.js"))
        return `export default ${JSON.stringify(toPublicConfig(siteConfig))};`;
      return null;
    },
  };
}

export default defineConfig({
  plugins: [publicConfigModule(), react(), smartSiteApi()],
  // The assistant chunk (ElevenLabs SDK, ~650 kB) is lazy-loaded only when the desk opens.
  build: { outDir: "dist", emptyOutDir: true, sourcemap: false, chunkSizeWarningLimit: 700 },
  preview: { host: "127.0.0.1", port: 4391, strictPort: true },
  server: { host: "127.0.0.1", port: 4391, strictPort: true },
});
