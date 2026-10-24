# Action Plan: rechnuvio.de

## Phase 1: Critical (Week 1)
- [ ] Return a real 404 status for unknown slugs and routes (`notFound()` plus `not-found.tsx`); verify with `curl -I https://rechnuvio.de/zzz-nope`.
- [ ] 301 redirect www.rechnuvio.de to rechnuvio.de.
- [ ] Fix English and mixed titles and descriptions on tool pages, starting with the highest-traffic tools (`src/data/tools.ts`, `src/messages/de.json`).

## Phase 2: High impact (Weeks 2-3)
- [ ] Cut per-page payload: pass only the needed i18n namespaces to `NextIntlClientProvider`. Target under 150 KB HTML.
- [ ] Public `Cache-Control` with `s-maxage` and `stale-while-revalidate`; stop setting the locale cookie on a single-locale site.
- [ ] Add security headers (HSTS, nosniff, frame-ancestors, Referrer-Policy, Permissions-Policy).
- [ ] Real `lastmod` dates in the sitemap.
- [ ] Verify an Impressum page exists and is linked in the footer.

## Phase 3: Content and authority (Month 2)
- [ ] 15-20 German how-to posts for top calculators, each linking to its tool.
- [ ] Rewrite the blog meta description and intro to match the Rechner positioning.
- [ ] Category hub intro copy and stronger internal linking.
- [ ] Review or remove low-demand US-centric tools from the sitemap.

## Phase 4: Monitoring (Ongoing)
- [ ] Connect Google Search Console; watch the "Soft 404" and "Duplicate" reports.
- [ ] Measure Core Web Vitals with PageSpeed and CrUX after the payload fix.
- [ ] Re-audit in 30 days and compare the score.
