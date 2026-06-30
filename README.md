# JunimoServer WebUI

Container-friendly direct-browser management panel for the documented JunimoServer REST API.

## Current mode

This repo now defaults to **direct browser mode**:

- The page is a static SPA.
- You fill in the JunimoServer API address in the UI.
- The browser sends requests directly to that target.
- The API key is stored only in browser storage, not baked into the image.

This matches your requested workflow, but it comes with a hard browser limitation.

## Important browser limitation

JunimoServer appears to send `Access-Control-Allow-Origin: *` on JSON responses, but it does **not** appear to fully handle browser CORS preflight for all protected endpoints.

That means:

- Simple unauthenticated `GET` requests may work.
- Cross-origin requests with `Authorization: Bearer ...` are likely to fail before they reach the server.
- `DELETE /farmhands` is especially likely to fail cross-origin because browsers preflight `DELETE`.
- `POST /newgame` with JSON body is also likely to fail cross-origin.

So direct browser mode works best when:

- the WebUI and JunimoServer API are **same-origin**, or
- the upstream API is changed to support full CORS preflight.

The UI surfaces this risk explicitly.

## Covered endpoints

Read:

- `GET /status`
- `GET /players`
- `GET /invite-code`
- `GET /health`
- `GET /stats`
- `GET /farmhands`
- `GET /settings`
- `GET /cabins`
- `GET /rendering`
- `GET /screenshot`
- `GET /auth`
- `GET /diagnostics/state` (opt-in)

Write:

- `POST /auth/timeout`
- `POST /rendering`
- `POST /time`
- `POST /clock-speed`
- `POST /roles/admin`
- `DELETE /farmhands`
- `POST /reload`
- `POST /newgame`

WebSocket:

- `/ws` direct browser connection for chat relay

## Local development

```sh
npm install
npm run dev
```

Then open the Vite dev URL and fill in the Junimo API address in the UI.

## Static build

```sh
npm run build
```

Output goes to `dist/client`.

## Containerization

The image is a static SPA served by Caddy. Runtime config is injected through `/config.js` at container startup, so the image does not need rebuilding for different environments.

Build and run with Docker Compose:

```sh
docker compose up --build
```

Default exposed port:

- `http://localhost:8088`

Runtime env vars:

- `WEBUI_TITLE`
- `JUNIMO_DEFAULT_API_BASE_URL`
- `JUNIMO_DOCUMENTATION_URL`

## Direct mode deployment advice

- If possible, put the WebUI under the **same origin** as JunimoServer API.
- If the page is HTTPS, do not point it at an HTTP API target; browsers block mixed content.
- Prefer not to persist API keys in local storage unless necessary.
- The current UI keeps destructive operations gated by explicit confirmation text, but browser-direct mode is still weaker than a backend-held-key proxy model.
