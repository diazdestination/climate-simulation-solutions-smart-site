# CSS search and AI discovery preparation

The existing public site is https://csshvac.com/. Its homepage references
`index-CEj1Hzm8.js` and `index-Cbrzl4ut.css`. A release build of commit
`5b18e3ed367df7e303532a8d6776d1d3d5a182c7` reproduced
both bundle filenames; the older Next.js scaffold and owner-private Sites v8
are not the deployed source. Work is isolated on `codex/css-discovery-20261109`.

## Prepared changes

- Preserve all 12 public routes and their existing canonical URLs and copy.
- Link HVACBusiness, WebSite and WebPage entities; add breadcrumbs and five
  service entities. Keep business facts from the existing approved config.
- Generate FAQ markup from the same arrays that render visible answers on
  the homepage and six content pages. Do not promise FAQ rich results.
- Add Open Graph image metadata and Twitter summary previews using the
  existing logo. No design, CSS, contact, service pricing or coverage changes.
- Generate optional `/llms.txt` from the public route inventory and approved
  contact/hours. Exclude the noindex assistant and draft privacy pages.
- Keep `/robots.txt` public and add `/api/` crawler exclusion. Keep the existing
  sitemap generated from indexable routes. No WAF/security changes.
- Prepare an IndexNow ownership file and submission command that first checks
  the public proof file. No notification has been sent. Engine acceptance
  would not prove indexing or ranking.

## Verified locally, November 9

- `SITE_PUBLIC_ORIGIN=https://csshvac.com npm run build`: passes, 13 prerendered
  routes plus the existing noindex privacy page.
- `npm run release:check`: passes with the previously approved, clearly labeled
  draft privacy policy; attorney review remains pending.
- `npm test`: 49 passed, zero failed/skipped.
- `python scripts/check-discovery.py --directory dist`: all 12 public pages
  pass canonical/metadata/schema/visible FAQ checks, guide/sitemap checks, and
  assistant/privacy noindex checks.
- Compared HTTP production bodies with candidate bodies: all 12 identical.
- Schema.org code-snippet validation of prepared homepage and maintenance
  service markup: zero errors and zero warnings for each complete graph.
- `git diff --check`: clean. Worker, bindings, provider config, dependencies,
  service request handling and styles are unchanged from the deployed base.

## Repository and deployment status

Draft PR: https://github.com/diazdestination/climate-simulation-solutions-smart-site/pull/8

The PR targets the existing React source branch
`claude/css-react-smart-site-20261014` because GitHub main still contains the
older scaffold. The target has two later request-result commits which this
candidate does not remove; `git merge-tree` verified a clean merge. Main has
not changed, and no merge or production publication is claimed. Existing CI
only watches the older `cloudflare/` subtree, so the 49 tests are local proof.

The Cloudflare CLI is signed out. A fresh OAuth attempt timed out awaiting
owner authentication; the browser is left at normal Cloudflare sign-in.
Do not reuse that expired OAuth request. After sign-in, restart the CLI flow
and verify the active account matches `C:\Forge\memory\ACCOUNT_MAP.md`.

Before publishing, read the actual domain-to-Worker mapping, deployed version,
bindings and settings. Preserve those settings and secrets, retain a rollback
version, and deploy only this metadata update without releasing other held
source changes. Historical CSS deployments were owned by GEEKOM; no change to
that deployment ownership has been inferred from old records.

After publication, run `python scripts/check-discovery.py` against production,
then `node scripts/submit-indexnow.mjs --output <receipt-path>` once. Verify the
saved HTTP receipt. Authenticated Search Console ownership and sitemap
submission remain separate checks. No search indexing is confirmed.

Evidence: `C:\Forge\artifacts\css-discovery-20261109` (local checks, test log,
production body comparison and Schema.org screenshots/state).
