# API Setup - Digital ToolPad

Every tool on Digital ToolPad processes the user's data **entirely in the browser**
(JavaScript, Web Workers, browser APIs, or browser-compatible WASM). No tool
uploads a file, a string, or any user content to a server, and no tool calls a
hosted AI service with user content.

**Current status: None required.**

No tool depends on a third-party API, a backend proxy, or a credential.

## How that is verified

The audit of all 492 tool routes confirmed zero outbound network requests on
every tool page. The route matrix in `docs/audit-evidence/routes-*.json` covers
17 combinations of browser, locale, viewport and theme; the field
`externalRequests` is empty for all 492 routes in every file.

The privacy audit went further: it opened every tool in a real browser, typed
into the first field, pressed the tool's own action buttons and fed an invalid
value to reach the error path, while recording every request that left the
origin and every write to the browser storage
(`docs/audit-evidence/privacy-audit.json`). Result: **0 external requests**
across all 492 tools, and **0 writes to localStorage, sessionStorage or
IndexedDB** - no tool persists user content anywhere.

User-triggered downloads are allowed and are the only way data leaves the
browser. Nothing is saved automatically.

## Tools that cannot do what their name promises

Nine tools are marked `BLOCKED_TECHNICAL` in `docs/tool-audit.csv`. None of
them needs an API - they are blocked by a browser limitation or by this site's
own no-third-party-request rule, and no compliant API would change that. Their
catalogue descriptions state the limitation instead of hiding it.

| Tool | Why it is blocked | What it does instead |
|---|---|---|
| `avi-to-mp4` | No browser can decode the AVI container, so the video cannot be read and no MP4 can be produced from it. | It reports that the format cannot be decoded here and says to convert the file with a video editor first. |
| `heic-to-jpg-converter` | No browser this site runs in ships a HEIC decoder, and no HEIC decoder is bundled. | It reads the HEIC container and shows the format brand, the compatible brands and the size of the picture. It never hands out a file that only shows an error notice. |
| `parquet-to-csv` | No browser ships a Parquet reader and the Apache Arrow format cannot be parsed without a library this site does not bundle. | It explains what Parquet is and which readers can show the rows. |
| `parquet-viewer` | No browser ships a Parquet reader, so the rows of the file cannot be shown. | It explains the format, the row groups and the compression codecs. |
| `local-ai-chat` | No model weights and no inference runtime ship with this site, so the chat cannot answer. | The workspace loads the weights for Qwen2.5 or Llama from this origin when they are placed there and reports the WebGPU state. No reply is ever invented. |
| `offline-ai-chat` | Same: no weights and no runtime are bundled. | Same, with Qwen2.5 and Llama. |
| `private-ai-chatbot` | Same: no weights and no runtime are bundled. | Same, with Phi-3 and Qwen2.5. |
| `youtube-thumbnail-downloader` | Downloading from YouTube needs a request to a third-party server, and this site never sends one. | It reads the video id out of the link and lists the official thumbnail addresses. |
| `youtube-thumbnail-grabber` | Same: downloading needs a request to a third-party server. | It builds the thumbnail addresses for up to 50 videos and lists them. |

Adding an API for any of these would break the rules in section 3 of the audit
brief, so none of them is listed as an API item.

---

## When an API *is* added later

Record it here before shipping. Every entry must document:

| Field | Requirement |
|---|---|
| Affected slugs | Exact tool slugs that use the API |
| Purpose | What the API is used for, in one sentence |
| Official signup URL | Link to the provider's own registration page |
| Official docs URL | Link to the provider's own API documentation |
| Free plan | Exact limits, verified from the provider's page - **not** trial credits |
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

- A key in `NEXT_PUBLIC_*` is **public** - it ships inside the browser bundle.
  `.env.local` does not make it secret. Only credentials the provider explicitly
  marks as browser-publishable may enter frontend configuration.
- Never bypass CORS through an external proxy.
- If a provider needs server-side computation, a file upload, personal input, or
  a confidential key, it is **not compatible** with this project's rules. Say so
  plainly rather than adding a backend.
- A tool that needs an unconfigured API must show the control as honestly
  unavailable and be tracked as `BLOCKED_API` in `docs/tool-audit.csv`. A mocked
  result is **not** a pass.
