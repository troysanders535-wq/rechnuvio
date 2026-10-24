# API Setup — Digital ToolPad

Every tool on Digital ToolPad processes the user's data **entirely in the browser**
(JavaScript, Web Workers, browser APIs, or browser-compatible WASM). No tool
uploads a file, a string, or any user content to a server, and no tool calls a
hosted AI service with user content.

**Current status: None required.**

No tool depends on a third-party API, a backend proxy, or a credential. The
audit of all 492 tool routes confirmed zero outbound network requests on every
tool page (`docs/audit-evidence/routes-en-desktop-light.json`, field
`externalRequests` is empty for all 492 routes).

The privacy audit went further: it opened every tool in a real browser, typed
into the first field, pressed the tool's own action buttons and fed an invalid
value to reach the error path, while recording every request that left the
origin (`docs/audit-evidence/privacy-audit.json`). Result: **0 external
requests** across all 492 tools.

Browser storage is also empty apart from the three notepad tools, which
autosave the open tabs on purpose (`localStorage["dtp-notepad"]`) and offer a
**"Delete all saved data"** control:

| Tool | Stored | Why |
|---|---|---|
| `online-notepad` | `dtp-notepad` | autosave of the open tabs, by design |
| `notepad-plus-plus-online` | `dtp-notepad` | autosave of the open tabs, by design |
| `rapidtables-notepad-alternative` | `dtp-notepad` | autosave of the open tabs, by design |

Every other tool leaves nothing behind on the device.

---

## When an API *is* added later

Record it here before shipping. Every entry must document:

| Field | Requirement |
|---|---|
| Affected slugs | Exact tool slugs that use the API |
| Purpose | What the API is used for, in one sentence |
| Official signup URL | Link to the provider's own registration page |
| Official docs URL | Link to the provider's own API documentation |
| Free plan | Exact limits, verified from the provider's page — **not** trial credits |
| Attribution requirement | Whether the provider requires visible attribution |
| Commercial use | Whether the free tier allows commercial use |
| Registration / key required | Yes/No. Keyless is strongly preferred. |
| CORS support | Whether the endpoint is callable directly from a browser origin |
| Browser compatibility | Verified from the provider's documentation |
| Configuration name | The `NEXT_PUBLIC_*` variable name, if any |
| Activation steps | Exact steps to configure and enable |
| Remaining live tests | What still needs a real browser test once a key exists |
| Date checked | ISO date the provider page was read |

### Hard rules

- A key in `NEXT_PUBLIC_*` is **public** — it ships inside the browser bundle.
  `.env.local` does not make it secret. Only credentials the provider explicitly
  marks as browser-publishable may enter frontend configuration.
- Never bypass CORS through an external proxy.
- If a provider needs server-side computation, a file upload, personal input, or
  a confidential key, it is **not compatible** with this project's rules. Say so
  plainly rather than adding a backend.
- A tool that needs an unconfigured API must show the control as honestly
  unavailable and be tracked as `BLOCKED_API` in `docs/tool-audit.csv`. A mocked
  result is **not** a pass.
