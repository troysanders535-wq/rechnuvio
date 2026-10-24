# SEO Audit: rechnuvio.de (2026-10-24)

Method: source review of the Next.js 16 project plus live HTTP checks (curl) on the homepage, robots, sitemap, and a sample of category, tool and blog pages. No Playwright, Lighthouse or Google API data was used, so Core Web Vitals are not measured. Business type: free browser-based calculators and utilities (about 490 tools), German-language.

## SEO Health Score: ~68 / 100 (estimate)

| Category | Score | Notes |
|---|---|---|
| Technical SEO | 62 | Soft-404s, www duplicate, no security headers, no-store caching |
| Content Quality | 60 | Mixed DE/EN strings, thin blog (7 posts), generic tool copy |
| On-Page | 72 | Unique titles/descriptions/canonicals, one H1 per page |
| Schema | 78 | WebApplication, FAQPage, Breadcrumb, Organization, WebSite |
| Performance | 55 (est.) | 500-700 KB HTML per page |
| AI Search Readiness | 60 | No real llms.txt, thin authority signals |
| Images | 75 | Few images, no missing alt in sampled pages |

## What works
- Canonical on every sampled page, self-referencing and on the correct domain.
- hreflang is consistent (de, de-DE, x-default) and matches the single-locale setup.
- robots.txt allows all and declares the sitemap. The sitemap has 529 unique URLs, no duplicates.
- Unique title and meta description per tool page. OG image is generated (1200x630).
- http to https 301. Google Search Console verification is present.
- Structured data on tool pages: WebApplication + Offer, BreadcrumbList, FAQPage.

## High findings

1. **Soft 404s.** `/zzz-nope`, `/de`, `/en`, `/tools/pdf-merge` (non-existent slug) and `/llms.txt` return **HTTP 200** with homepage or tools-index content, `noindex`, and a canonical to the homepage or tools page. Google reports these as soft 404s and crawl budget is wasted. Fix: call `notFound()` for unknown slugs in `[slug]` and `[category]`, add `app/not-found.tsx`, and confirm the status is a true 404. The likely cause is `cacheComponents` streaming, where the 200 header is sent before `notFound()` runs; check the Suspense boundaries and `instant = false` in `src/app/layout.tsx`.
2. **www host not redirected.** `https://www.rechnuvio.de` returns 200 with no redirect. Add a 301 www to apex in Hostinger or in `next.config.ts` `redirects()`.
3. **Mixed-language titles and descriptions.** Sampled German pages carry English: "Bank Statement to Excel – kostenlos online", "High School GPA Rechner", "RGB to HEX Konverter", and a description beginning "Free High School GPA Rechner". Rewrite the tool names and descriptions with German keywords (for example "RGB zu HEX Umrechner"). The `{name} – kostenlos online` template is fine; the `name` values are the problem. Consider dropping US-centric tools (GPA, Christmas gift tracker) from the sitemap if they have no German demand.
4. **Page weight.** Tool pages are about 500 KB of HTML, category pages about 700 KB, the homepage about 620 KB. The full message catalog (`src/messages/de.json`, about 267 KB) is probably serialized into every page through `NextIntlClientProvider` plus the RSC payload. Pass only the namespaces each page needs, and keep the full tool catalog out of client props. This is the biggest lever for LCP and INP.
5. **Caching.** The homepage sends `Cache-Control: private, no-cache, no-store`, so the CDN cannot cache it. Set `s-maxage` plus `stale-while-revalidate` for public routes. The middleware also sets a `NEXT_LOCALE` cookie on every response, and `Set-Cookie` blocks shared caching. With a single locale, drop the cookie.

## Medium findings
6. **Security headers missing:** no HSTS, X-Content-Type-Options, frame-ancestors/X-Frame-Options, Referrer-Policy or Permissions-Policy. Add them in `next.config.ts` `headers()`.
7. **Sitemap hygiene:** every `lastmod` is the same static date, and `changefreq`/`priority` are ignored by Google. Use real per-tool and per-post dates, or omit `lastmod`.
8. **Blog is thin and off-brand:** 7 posts, and the meta description talks about "Architekturanalyse, Datenserialisierung" while the site positions itself on Rechner (percent, date, BMI, salary). Write calculator how-to content ("Prozent berechnen", "Brutto Netto", "Tage zwischen Datum") that links to the tools. That is where most German search demand is.
9. **FAQPage schema** no longer gives rich results for most sites. Keep it for answer engines but expect no SERP feature.
10. **Inconsistent counts:** the layout Twitter title says "492 kostenlose Browser-Tools", the homepage says "über 400".
11. **Duplicate Google verification tag** in `src/app/layout.tsx` (`metadata.verification` and a manual `<meta>`). Remove the manual one.
12. **Dead English-domain scaffolding and `?locale=` override** in `src/i18n/domains.ts` and `src/middleware.ts`. Query-param locale switching can create indexable duplicates. Remove it if the English site is not live.
13. **Internal linking:** the homepage has 92 internal links for about 490 tools, and tool pages link to only a few related tools. Add category hubs with descriptive anchors and link from blog posts.

## Low
- `/llms.txt` returns the HTML fallback. Add a real file or return a clean 404 (optional, ignored by Google).
- No Impressum page found among about/contact/privacy/terms. German sites need one (legal requirement and trust signal); verify it exists.
- Repo root holds logs (`audit-server.log`, `final-audit.log`), `Claude outputs/` and `tsconfig.tsbuildinfo`. Make sure they are gitignored and not deployed.

## Not assessed (needs data)
Core Web Vitals field data, indexation and rankings (connect Search Console), backlinks, mobile screenshots. I did not run the specialist subagents, PageSpeed or Playwright.

## Corrections and fix status (added after implementation)
- The local `main` checkout was 2 commits behind `origin/main` (the Rechnuvio rebrand PR that is live). The Impressum page already exists upstream, but it returns 404 until `IMPRESSUM` in `src/lib/brand.ts` is filled in. That is the remaining action, not a missing page.
- Fixed on branch `seo-fixes` (worktree `../digitaltoolpad-seo`, commit fd98ed7, based on origin/main, not pushed): soft 404s, www redirect, security headers, locale cookie, page weight (tool pages about 500 KB to about 90 KB in dev), German tool names/descriptions for about 215 tools, sitemap lastmod, duplicate verification tag.
- Not done: public Cache-Control (dynamic rendering sets its own; test on Hostinger first), new blog content, `/tools` index page size (about 875 KB because it lists all tools), contact form (it does not send anything).
