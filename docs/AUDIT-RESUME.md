# Audit resume pointer

Generated 2026-10-24T17:40:03.380Z.

- Reconciled total: **492** tools
- BLOCKED_TECHNICAL: 9 · PASS: 483
- Next item: **avi-to-mp4** (BLOCKED_TECHNICAL)
- Remaining non-PASS rows: 9

The authoritative tracker is `docs/tool-audit.csv`. The machine-readable
pointer is `scripts/audit/data/audit-state.json`.

## Resume commands

```powershell
npm run build  (or: $env:NEXT_DIST_DIR='.next-audit'; npx next build)
Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', 'set "NEXT_DIST_DIR=.next-audit" && npx next start -p 3100 > audit-server.log 2>&1'
node scripts/audit/functional-tests.mjs --only=<slug>
node scripts/audit/build-findings.mjs
node scripts/audit/sync-audit-tracker.mjs
node scripts/audit/build-audit-summary.mjs
```
