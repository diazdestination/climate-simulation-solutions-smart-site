# CSS search and AI discovery preparation

The existing public site is https://csshvac.com/. Its homepage references
`index-CEj1Hzm8.js` and `index-Cbrzl4ut.css`. A frontend release build of commit
`5b18e3ed367df7e303532a8d6776d1d3d5a182c7` reproduced
both bundle filenames; the older Next.js scaffold and owner-private Sites v8
are not the deployed frontend source. Work is isolated on `codex/css-discovery-20261109`.

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


## November 10 publication (supersedes the pending deployment status above)

Adam signed into Cloudflare. Verified active identity: diazdestination@gmail.com,
account 4d9480db003a5c1e601c5dfac0d66505. Both csshvac.com and www.csshvac.com map
to Worker climate-simulation-solutions-site.

Frontend bundle equality did not establish backend equality: the deployed server
predated some Git source hardening. Therefore this publication used the exact
server module downloaded through the authenticated Cloudflare API, without
rebundling it. Its SHA-256 stayed
16a4a615dde5f3762843bb41bcddb3645988a607c7af18fd81c69f75a30e267b.
Only the frontend assets and discovery/verification files were replaced.

- Frontend source: commit 6b5bfbf on codex/css-discovery-20261109; subsequent
  documentation commits do not change the deployed application assets.
- Current Worker version: 441f7e88-ff6c-4866-9d1c-1ec2377638da at 100% traffic.
- Deployment: a3cecad8-3e9d-44a0-a6c5-e267d3b08cfd.
- Original rollback version: 721cc888-4b14-4690-9a20-2d1231536fe8. Initial
  discovery-only version d9c2a0ef-e021-4bb4-8738-b6ae54ff3a54 is also retained.
- Staged version validation confirmed identical server etag, all 16 bindings,
  and runtime/asset routing. Post-deploy checks confirmed identical server
  module, binding fingerprints, schedules, subdomain settings and domains.
- Wrangler's documented API keep_bindings metadata preserves plain variables,
  encrypted secrets and Secrets Store references without reading secret values.
  The local release overlay passes that metadata through Wrangler's experimental
  unsafe.metadata field; it does not reduce security settings or change scopes.
  The overlay and downloaded server snapshot are under the evidence directory,
  not a replacement production config in Git. Do not deploy the repository's
  older bare Wrangler config: it omits the live Secrets Store references.
- Production HTTP/content checker: all 12 canonical public pages pass. GET/HEAD
  robots.txt, sitemap.xml and llms.txt return 200; assistant/privacy stay noindex.
- Published maintenance service schema fetched by Schema.org: zero errors and
  zero warnings for the complete linked graph.
- GET /api/lead: ready:true, code:email_ready; confirmations remain off. No test
  lead, customer message, billing, secret-value or database mutation occurred.
- IndexNow accepted one notification for 12 canonical public URLs with HTTP202.
  Ownership validation and indexing remain pending; do not repeatedly resubmit.
- Added Google's provided ownership file to public assets. Its exact content is
  readable through the host's same-origin extension-removal redirect. Search
  Console under diazdestination@gmail.com is awaiting explicit owner approval
  to verify ownership and submit the sitemap. No Google submission is claimed.

GitHub main remains b5867bb and PR8 remains an open draft, unmerged. This is a
verified publication of the scoped frontend assets with the prior server module,
not a release of all backend commits from the React source branch.


## Google verification and sitemap accepted, November 10

After Adam explicitly approved clicking Verify, Search Console confirmed ownership
of https://csshvac.com/ for diazdestination@gmail.com using the published HTML
file. The existing same-origin extension-removal redirect was accepted. Preserve
the verification file to maintain ownership.

Submitted https://csshvac.com/sitemap.xml once. The submitted sitemap row shows
Status: Success, Discovered pages: 12, Discovered videos: 0, with submitted and
last-read dates November 10, 2026. This supersedes the pending Google approval
and submission statuses above. These results establish ownership and discovery,
not indexing, ranking, search impressions or customer traffic.

Evidence: google-search-console-receipt.json, google-ownership-verified.png,
google-sitemap-state.txt and google-sitemap-success-12.png in the existing
C:/Forge/artifacts/css-discovery-20261109 directory. No production code or
provider configuration changes were required in this verification step.
