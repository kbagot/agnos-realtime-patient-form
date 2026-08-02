# Agnos — live patient intake

A patient fills in an intake form. The care team watches it happen, field by field, on a second
screen — including which field the patient is on right now, whether they have stalled, and what is
blocking their submission.

Built for the Agnos front-end candidate assignment.

| | |
|---|---|
| **Stack** | Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS v4 · `ws` |
| **Interfaces** | `/patient` — the form · `/staff` — the live board |
| **Planning doc** | [`docs/development-planning.md`](docs/development-planning.md) |

Open `/patient` on a phone and `/staff` on a laptop at the same time — that is the whole demo.

---

## Run it locally

```bash
npm install
npm run dev          # http://localhost:3000
```

`npm run dev` boots [`server.ts`](server.ts): Next.js in dev mode **plus** a WebSocket server on
`/api/ws`, in one process. Then open two tabs:

- <http://localhost:3000/patient> — the form
- <http://localhost:3000/staff> — the board

Type in one, watch the other.

```bash
npm run build && npm start   # production build behind the same custom server
npm run lint                 # eslint
npx tsc --noEmit             # typecheck
```

`npm run dev:next` starts plain `next dev` without the WebSocket server; the client detects the
missing socket and falls back to SSE, which is a convenient way to exercise the fallback path.

### Environment

Everything works with zero configuration. See [`.env.example`](.env.example) for the three knobs:

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_REALTIME_TRANSPORT` | auto | `websocket`, `sse`, or unset to try WS and fall back |
| `NEXT_PUBLIC_WS_URL` | same origin | Point the browser at a WebSocket server on another host |
| `PORT` | `3000` | Port for the custom server |

---

## What is implemented

**Patient form** (`/patient`)

- All thirteen requested fields, grouped into Identity / Contact / Background / Emergency contact.
- Validation with Zod + React Hook Form: required fields, a real phone-number check, email format,
  date-of-birth sanity (not in the future, not 150 years ago). Errors appear once a field has been
  touched and clear the moment they are fixed.
- Mobile-first: single column, 44 px touch targets, a sticky action bar so submit is always under
  your thumb, and a two-column layout with a sticky progress rail from `lg` up.
- A stable session reference (`PT-XXXX`) that survives a refresh, so the same patient keeps the same
  record on the staff board.

**Staff view** (`/staff`)

- Every open intake, updating on each keystroke — no polling, no refresh button.
- Three unmistakable states, as the brief asks: **Filling in** (green, pulsing) · **Inactive**
  (amber, after 8 s without input) · **Submitted** (blue). A dropped connection is shown separately
  from being idle, because to a nurse those mean different things.
- Master/detail on desktop, a single scrollable list on mobile; changed rows flash, so a glance is
  enough to see what moved.
- The patient's own validation errors are mirrored, so staff can see someone is stuck on the phone
  field instead of guessing.

**Both**

- Full keyboard access, labelled controls, `aria-live` announcements, and no state signalled by
  colour alone.
- Deliberate dark mode — the staff board is a screen that runs overnight.
- Reconnect with exponential backoff and a full resync, plus a visible banner while data may be
  stale.

### Extras beyond the brief

- **Bilingual, English and Thai.** Both interfaces switch language instantly — labels, help text,
  validation messages, gender and language values, and date formatting. The choice is remembered,
  defaults to Thai for a Thai browser, and switching mid-form keeps the session and everything
  already typed. Validation messages travel over the wire in English and are translated at render
  time, so a Thai patient and an English-reading nurse can look at the same record in their own
  language at the same time.
- **Two interchangeable transports.** WebSocket by default; an SSE + POST fallback for serverless
  hosts, switched by one environment variable. Same protocol, same store, same UI.
- **Live field focus** — the board shows the exact field being edited, with a caret.
- **Mirrored validation state**, completion percentage, and per-patient activity timestamps.
- **Sensitive fields masked** (phone, email, address, religion) behind a per-session *Reveal*
  toggle, so a waiting-room screen does not leak PII by default.
- **Nothing is persisted.** Records live in server memory and are swept once abandoned — the least
  irresponsible default for unsubmitted medical data in a demo.

---

## Deployment

The app ships two transports because the two obvious hosts have opposite constraints.

**Render / Fly / Railway / any container — real WebSockets (recommended).**
One long-lived Node process runs both Next and `ws`. [`render.yaml`](render.yaml) is a ready
blueprint; [`Dockerfile`](Dockerfile) covers everything else.

```bash
docker build -t agnos-intake . && docker run -p 3000:3000 agnos-intake
```

**Vercel — SSE transport.** Vercel's serverless functions cannot hold a WebSocket open, so
[`vercel.json`](vercel.json) sets `NEXT_PUBLIC_REALTIME_TRANSPORT=sse` at build time: Server-Sent
Events downstream, `POST /api/realtime/publish` upstream. Identical behaviour for the user; the
honest trade-off (the in-memory hub assumes a single instance) is in the planning doc.

---

## Project structure

```
server.ts                      Next + WebSocket server (one process)
src/
  app/
    page.tsx                   Landing page — links to both interfaces
    patient/                   Patient form route
      _components/             Colocated: only this route uses them
      _hooks/
    staff/                     Staff board route
      _components/
      _hooks/
    api/
      realtime/stream/         SSE downstream  (fallback transport)
      realtime/publish/        POST upstream   (fallback transport)
      health/                  Liveness probe
  components/ui.tsx            Shared primitives (status pill, cards, buttons)
  components/locale-switcher.tsx
  lib/
    i18n/locale.tsx            Locale context; i18n copy lives beside each route
    i18n/common.ts             Field labels, statuses, errors in en + th
    patient-form.ts            Field metadata + Zod schema — one source of truth
    realtime/protocol.ts       Wire protocol shared by client and server
    realtime/use-realtime.ts   The only realtime API the UI touches
  server/
    session-store.ts           Transport-agnostic in-memory hub
    apply-message.ts           Validates and applies a client message
```

Modules live next to the route that uses them and only graduate to `src/lib` or `src/components`
when a second consumer appears. Full rationale in
[`docs/development-planning.md`](docs/development-planning.md).
