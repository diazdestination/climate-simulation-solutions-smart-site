# Remix guide: new HVAC client in about an hour

Everything client-specific is isolated. Work top to bottom.

## 1. Facts (10 min)

`src/lib/site.ts` — name, short name, description, service areas, services (title, detail, slug). The phone comes from `NEXT_PUBLIC_BUSINESS_PHONE` and stays empty until the office approves a number. Interior pages (`src/app/about`, `maintenance`, `service-areas`, `services/[slug]`) carry short region copy; search for "Tri-County" and replace.

## 2. Logo (5 min)

Replace `public/brand/logo.svg`, `public/brand/logo-160.png` (header, 160px square, transparent), `src/app/icon.png` (256) and `src/app/apple-icon.png` (180). Keep the file names and nothing else changes.

## 3. Palette (15 min)

`src/app/globals.css` `:root` tokens:

| Token | Role |
| --- | --- |
| `--bg`, `--panel`, `--line` | page, cards, hairlines (dark base) |
| `--ink`, `--muted` | text |
| `--aqua` | cool accent used across eyebrows, links, highlights |
| `--flame`, `--flame-deep`, `--sun` | warm accent, primary CTA gradient, emergency band |
| `--sky`, `--navy` | cool accent and deep base used by visuals |

The primary button gradient and the emergency band gradient are written out in `globals.css`; search `button-primary` and `emergency-band`. The hero scene's colours live in `brandGlsl` in `src/components/visuals/airflow-shaders.ts` (six RGB constants: two flame tones, sun, sky, light sky, ice). Match them to the tokens.

## 4. Hero copy and visual (10 min)

`src/app/page.tsx` — headline (the `<em>` word gets the serif italic), description, eyebrow, meta line. The airflow visual's labels are in `src/components/visuals/hero-visual.tsx`. The ridgeline is `Ridgeline` in `brand-icons.tsx`; swap its paths for the client's skyline or remove it for a flat region.

## 5. Type (5 min)

`src/app/layout.tsx` loads Manrope and Instrument Serif through `next/font/google`. Change the imports and the two `variable` names stay the same.

## 6. Services and icons (10 min)

Six service cards map slug → icon in `ServiceIcon` (`brand-icons.tsx`). Add or rename slugs in `site.ts` and give each an icon.

## 7. Intake (operator)

Forms post to `/api/requests` and stay disabled until `GROWTHOS_LEAD_WEBHOOK_URL` and `GROWTHOS_LEAD_WEBHOOK_TOKEN` are set in the deployment secret store. See `docs/GROWTHOS_INTEGRATION.md`.

## Checks before handoff

```bash
npm run lint && npm run format:check && npm run build
```

Then open the home page at 1440px and 390px, with and without reduced motion, and confirm the Book Service button is visible before and after scrolling.
