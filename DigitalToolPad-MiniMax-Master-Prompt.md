# MiniMax Master Prompt — Digital ToolPad Tool Audit & Repair

Act as the senior frontend engineer and QA engineer for my existing Digital ToolPad project. **Implement, run, verify, and repair every tool; do not stop at an audit or plan.** Work in the existing repository and stack, at `http://localhost:3100`. Keep changes local; do not deploy.

## 1. Establish the complete inventory

- Read `digitaltoolpad-tools-link-sheet.xlsx`, especially **All Tools**, **German (DE)**, **Summary**, and **Site Pages**. The workbook currently lists **492 tools in rows 5–496**, not 496 tool entries. I expect 496 tools: reconcile this difference against the actual repository, catalog, routes, and sitemap. Never invent four tools or silently omit any.
- Use each row's **Name, Description (cleaned), Slug, Engine, and URL (Local)** as the intended specification. Inspect the authored description if needed. The Engine field describes existing wiring; it is not proof that the engine is correct.
- Check `src/data/tools.ts`, `src/data/tools_de.json`, and `src/app/sitemap.ts` if present; discover their actual replacements if paths have changed. Map German entries to English by slug; do not double-count translations as distinct tools.
- Inventory missing routes, duplicate slugs, undocumented repository tools, wrong engine assignments, and mismatched descriptions. Record discrepancies and resolve clear mapping mistakes. Flag genuinely ambiguous requirements while continuing independent work.
- Preserve existing work, URLs, navigation, design system, typography, and light/dark themes. Inspect repository instructions and package scripts first. Do not overwrite unrelated changes.

## 2. Audit → implement → test every row

For EACH tool, open its local URL in a real browser, inspect its source and runtime behavior, and compare its inputs, controls, output, features, and FAQ with its intended purpose.

1. Write specific acceptance criteria from the description before fixing it.
2. Identify wrong pages, placeholder outputs, misleading controls, generic fallback engines, incomplete implementations, incorrect formulas, and broken downloads.
3. Repair or build the actual tool. A renamed word counter or generic text editor does not satisfy an unrelated tool. Shared components are allowed only when they deliver the correct behavior for that particular tool.
4. Validate inputs, calculate/process correctly, and provide useful loading, success, error, empty, unsupported-format, and reset states as applicable. Handle repeated clicks, concurrent processing, cancellation, and stale results where relevant.
5. Run functional tests with independently established expected results. Verify the actual UI and output, not just helper functions or successful page rendering.
6. Record evidence and status, then continue to the next row. Fix shared engines efficiently, but verify every consuming route separately.

Do not change a tool's description to disguise missing functionality. If a promised capability conflicts with browser-only execution, document that limitation and mark the tool blocked until a compliant solution exists.

## 3. Mandatory client-side processing and no file retention

- All tool computation and file processing must execute in the user's browser through JavaScript, browser APIs, Web Workers, or browser-compatible WASM. No processing backend, server action, server upload, database, remote conversion service, or hosted AI inference for user content.
- Keep user files, extracted text, inputs, outputs, and intermediate data in memory only. Do not persist them to localStorage, sessionStorage, IndexedDB, Cache Storage, OPFS, cookies, service-worker caches, logs, analytics, crash reports, or servers. Theme preferences may remain if they contain no user content.
- Use file inputs, File/Blob, ArrayBuffer, and temporary object URLs. Release workers, buffers, canvases, and object URLs on reset/unmount when safe. Do not revoke URLs before downloads finish. User-triggered downloads are allowed; automatic saving is not.
- Verify privacy with browser network inspection and storage checks during real use, including error paths. No user content, filenames, or file metadata may leave the browser. Test records must use synthetic fixtures, never retain real user files.
- Prefer bundled/self-hosted dependencies, fonts, WASM, models, and static data. Lazy-load heavy engines and use workers for expensive tasks. Support offline operation for local-processing tools after their required assets are available; do not claim API-backed tools work offline.
- If a capability cannot be delivered within these rules, report the precise technical constraint. Never silently introduce a backend or fake successful processing.

## 4. Repositories and free APIs

Prefer native browser APIs and existing dependencies; add a library only when it solves a demonstrated need. When needed, research current official documentation and upstream repositories, verify browser compatibility, maintenance, license/commercial-use requirements, and pin a tested version in the lockfile. Record exact source URLs and versions. Do not install arbitrary repositories or use unverified package/API names.

External APIs are allowed only for essential public/reference data, fetched directly by the browser, with no user content transmitted. If an API needs personal input, file uploads, server-side computation, a backend proxy, or a confidential key in the frontend, it is incompatible with these requirements.

For any proposed API:

- Verify from official provider documentation that it has an ongoing free plan, not merely trial credits. Record the exact free-plan limits, attribution, commercial-use terms, registration/key requirements, CORS support, and the date checked. Do not promise unlimited or permanently free service.
- Test the endpoint from the actual browser origin when access is available. Handle rate limits, timeouts, cancellation, invalid responses, offline mode, and provider errors. Never bypass CORS through an external proxy.
- Prefer keyless services. Only explicitly publishable, browser-approved credentials may enter frontend configuration. `.env.local` does not make a value secret once bundled into browser code. Never expose confidential keys.
- If registration or a credential is unavailable, implement the real adapter, validation, timeout/error handling, feature gate, and setup instructions. Include placeholders in `.env.example` only for browser-safe configuration; commit no credentials. Keep API-required controls honestly unavailable until configured.
- Add the item to `docs/API-SETUP.md`: affected slugs, purpose, official signup/docs URLs, verified free limits/terms, browser compatibility, configuration names, exact activation steps, and remaining live tests. If no compliant free provider exists, state that clearly.
- Mock tests can verify adapter behavior, but **cannot** establish live integration success. Mark awaiting credentials as `BLOCKED_API`, continue other tools, and do not count it as passed. After credentials are supplied, rerun real integration, browser, privacy, and regression checks.

## 5. Content and usability on every tool

Place a tool-specific **“How to use this tool”** section immediately ABOVE **“Frequently Asked Questions”**. Use 3–6 concise numbered steps covering the actual inputs, options, action, result, and export/reset behavior where applicable. Include a small valid example when useful. If the FAQ is missing, add it beneath these instructions.

Update feature descriptions and FAQs to match verified behavior, supported formats, limits, privacy, and actual dependencies. Remove irrelevant copied content and unsupported claims. Provide equivalent German content on the German locale using the project's existing locale mechanism; respect decimal separators, units, dates, labels, and validation. Verify how the local project selects German rather than assuming the identical local URLs choose it automatically.

Use responsive layouts, visible labels and focus states, keyboard operation, accessible errors/results, adequate contrast, and reduced-motion support. Preserve SEO titles, canonical URLs, locale links, navigation, and sitemap coverage where affected.

## 6. Required verification

Use the project's existing runner and real-browser automation, preferably Playwright if compatible. Add meaningful regression tests for repaired behavior. Do not replace functional assertions with screenshots, snapshots, HTTP 200 checks, or DOM-existence checks alone.

For every tool, test each distinct promised capability with known-good fixtures and independent expected outputs, plus applicable empty, invalid, boundary, and repeated-use cases. Exercise every interactive control and mode, reset, copy, download/export, and error recovery. Inspect generated files by reopening/parsing them; verify content, MIME type, extension, and fidelity, not just download completion.

Apply category-specific checks: numerical precision/rounding and units; leap years/time zones for dates; Unicode for text; corrupt/encrypted/unsupported files and transparency/orientation for media; correct result-to-display mapping for random tools. For random tools, use deterministic tests for outcome mapping and independent real draws for runtime checks; a small sample need not be exactly 50/50. For tokenizers and format parsers, test the exact supported model/format instead of presenting estimates as exact results.

Run route-level functional checks across all tools, desktop/mobile layouts, both themes, and both locales. Use Chromium, Firefox, and WebKit where supported; record actual versions and unavailable environments. Check console errors, hydration, broken assets, unexpected network calls, content persistence, and navigation. Permission-dependent features need both permission granted and denied tests. Unsupported browser features must show a truthful fallback.

Run applicable lint, type checks, build, unit/integration tests, and browser suites. After shared changes, rerun affected regression tests; finish with full-suite verification on the final code state. Fix introduced failures and document pre-existing blockers with evidence. Never disable tests or weaken assertions to obtain a pass.

## 7. Durable tracking and completion gates

Maintain these files in the repository:

- `docs/tool-audit.csv`: one record per inventoried tool, including workbook sheet/row, slug, locale coverage, intended behavior, discovered problem, changed files, dependency/API, status, test IDs, expected/actual results, evidence paths, tested code revision/date, and blocker details. Quote CSV fields correctly.
- `docs/API-SETUP.md`: the actionable API queue described above; state “None required” if empty.
- `docs/TOOL-AUDIT-SUMMARY.md`: reconciled inventory, completed repairs, commands/results, coverage, failures, limitations, and next steps.
- Automated regression tests and synthetic fixtures using existing project conventions.

Use exactly these statuses: `NOT_STARTED`, `IN_PROGRESS`, `PASS`, `FAIL`, `BLOCKED_API`, `BLOCKED_TECHNICAL`, `BLOCKED_ENVIRONMENT`. A `PASS` requires all applicable acceptance criteria and recorded real-browser functional/privacy checks to pass. API placeholders, mocked-only results, inaccessible browsers, and untested capabilities are not passes.

Work in batches of roughly 10–20 tools, checkpoint the tracker after each batch, and continue autonomously across all tools. Keep a durable next-item pointer so a new session resumes from verified progress. Coordinate shared-file edits if using parallel workers. Do not stop after one batch, ask me to approve routine fixes, or wait idle for APIs while independent work remains.

**The target is 100% verified tool coverage and zero known failing acceptance tests. A prompt cannot guarantee defect-free software: report measured results honestly.** Claim all tools working only when the reconciled inventory has no failures, blocked tools, untested rows, or unverified required capabilities. Report `PASS / reconciled total` and every other status count, including missing expected entries. Explain precisely what remains if full completion is impossible under the stated constraints.

Start now: inspect the project and workbook, reconcile the inventory, create the tracker, establish baseline checks, and implement/test the first batch. Continue until all tools have been addressed and the final report is complete.
