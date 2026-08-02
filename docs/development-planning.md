# Development planning

The four sections the brief asks for — project structure, design, component architecture, and the
real-time synchronisation flow — plus the trade-offs behind each.

---

## 1. Project structure

```
server.ts                          Next request handler + ws server, one process
next.config.ts
render.yaml  Dockerfile  vercel.json    Two deploy targets, two transports
docs/development-planning.md

src/
  app/
    layout.tsx                     Fonts, metadata, theme colour
    globals.css                    Design tokens (the only place colours are defined)
    page.tsx                       Landing: send the reviewer to both interfaces

    patient/
      page.tsx                     Route shell + metadata (server component)
      _components/
        patient-form.tsx           Form state, validation, outbound sync
        field-control.tsx          One renderer for every control type
        session-identity.tsx       Reference, connection, progress, start over
      _hooks/
        use-patient-session.ts     Stable session id across refreshes

    staff/
      page.tsx                     Route shell + metadata (server component)
      _components/
        staff-board.tsx            Layout, filters, counters, selection
        session-card.tsx           One patient in the list
        session-detail.tsx         Every field of the selected patient
        empty-state.tsx            First-run guidance
      _hooks/
        use-field-flash.ts         Which fields changed since the last frame

    api/
      realtime/stream/route.ts     SSE downstream (fallback transport)
      realtime/publish/route.ts    POST upstream  (fallback transport)
      health/route.ts              Liveness probe

  components/
    ui.tsx                         Primitives used by *both* routes

  lib/
    patient-form.ts                Field metadata + Zod schema
    realtime/protocol.ts           Wire types + timing constants
    realtime/use-realtime.ts       Transport selection, reconnect, message queue

  server/
    session-store.ts               In-memory hub, transport-agnostic
    apply-message.ts               Validate a ClientMessage, apply it to the store
```

**Colocation rule.** A module lives beside the single route that uses it, inside a `_components` /
`_hooks` private folder (the `_` prefix keeps them out of the router). It only graduates to
`src/lib` or `src/components` when a second consumer actually appears — which is exactly what
happened to `ui.tsx`, `patient-form.ts` and everything under `realtime/`. The payoff: deleting a
feature is `rm -r` on one folder, and reviewing one route means reading one folder.

**Two shared sources of truth.** `lib/patient-form.ts` describes the record once — label, group,
control type, whether it is required, whether it is sensitive — and both interfaces render from
that array. Adding a field is a one-line change that appears in the form *and* on the staff board
with no chance of drift. `lib/realtime/protocol.ts` does the same for the wire: every message either
type-checks against it or does not compile.

---

## 2. Design

**The two screens have opposite jobs.** The patient is anxious, on a phone, possibly one-handed,
possibly not reading in their first language. Staff are scanning a dense board from two metres away,
several patients at once. Same tokens, different density.

**Tokens, not hex codes.** Every colour is a semantic token in `globals.css`
(`surface`, `ink-soft`, `brand`, `live`, `idle`, `done`, `danger`, …) declared in OKLCH so light and
dark keep the same perceived lightness. No component uses a raw Tailwind palette colour, so dark
mode is a token swap rather than a per-component `dark:` audit.

**Responsive strategy.**

| Breakpoint | Patient form | Staff board |
|---|---|---|
| `< 640px` | Single column, 44 px targets, sticky submit bar with live completion | Single scrollable list; tapping a card opens the detail with a back control |
| `640–1024px` | Two columns inside each group card | List with a wider card; detail as a full-width panel |
| `≥ 1024px` | Form + sticky progress rail | Two-pane master/detail: ~380 px list, detail fills the rest |

Mobile-first in the literal sense: base styles are the phone layout, and every breakpoint only adds.

**Status vocabulary.** Three states the brief names, given one shape each and never expressed by
colour alone: *Filling in* (green, pulsing dot), *Inactive* (amber), *Submitted* (blue). A fourth
signal — the patient's socket dropped — is deliberately separate, because "went quiet" and "lost
signal" call for different responses at a reception desk.

**Motion with a job.** A row flashes when its value changes so the eye lands on what moved; the live
dot pulses to prove the feed is alive; cards rise 6 px on mount. Everything is under 400 ms, and all
of it is disabled under `prefers-reduced-motion`.

**Accessibility.** Every control has a real `<label>`, errors are `role="alert"` and wired through
`aria-describedby`, status changes are announced in a polite live region, focus is visible, targets
are 44 px, and both screens are fully keyboard-operable. Not decoration: a hospital form is exactly
the case where this matters.

**PII by default.** Phone, email, address and religion are masked on the staff board until someone
presses *Reveal*. A shared screen at a reception desk should not broadcast a stranger's address.

---

## 3. Component architecture

```
app/patient/page.tsx                    server: metadata, shell
└── PatientForm                         client: owns the form
    ├── useRealtime()                   ← the only realtime API the UI sees
    ├── usePatientSession()             stable session id
    ├── SessionIdentity                 reference · connection · completion · reset
    └── FieldControl × 13               driven by FIELDS metadata

app/staff/page.tsx                      server: metadata, shell
└── StaffBoard                          client: owns selection + filters
    ├── useRealtime()                   ← same hook, no patient concepts
    ├── SessionCard × n                 list item, status, preview
    ├── SessionDetail                   grouped fields for the selected patient
    │   └── useFieldFlash()             what changed since last frame
    └── EmptyState

components/ui.tsx                       StatusPill · ConnectionBadge · Card ·
                                        CompletionBar · buttonStyles · relativeTime
```

**Rules the tree follows.**

- Server components own routing, metadata and static shell; the `"use client"` boundary starts at
  the first component that needs state. Nothing ships to the browser that does not have to.
- `useRealtime` is the *only* module that knows a transport exists. Neither screen imports `ws`,
  `EventSource` or `fetch`. Swapping in Pusher or Ably is a one-file change.
- The store is transport-agnostic in the same way: `server/session-store.ts` exposes
  `join / update / blur / submit / reset / snapshot / subscribe`, and both the WebSocket server and
  the SSE routes drive it through `apply-message.ts`. Behaviour cannot diverge between transports
  because there is only one implementation of it.
- Rendering is metadata-driven, not hand-written per field, which is what keeps thirteen fields from
  becoming thirteen opportunities for the two screens to disagree.

---

## 4. Real-time synchronisation flow

### Happy path

```
Patient types "Som" in First name
  │
  │  React Hook Form onChange → coalesced to ≤1 message / 120 ms
  ▼
{ type: "patient:update", sessionId, values, errors, activeField: "firstName" }
  │  WebSocket frame  (or POST /api/realtime/publish when in SSE mode)
  ▼
apply-message.ts        validates the envelope, rejects anything unknown
  ▼
session-store.ts        merges values, recomputes completion, stamps updatedAt,
                        sets status = "typing", then notifies subscribers
  ▼
every subscribed socket / SSE stream
  ▼
{ type: "session:upsert", session }
  ▼
useRealtime reducer     replaces that session in the list
  ▼
Staff board             row flashes, caret moves to First name, % ticks up
```

Typical end-to-end latency on a local network is a few milliseconds; the deliberate 120 ms coalescing
window dominates it, and exists so a fast typist produces ~8 messages a second instead of 60.

### The status machine

| From | Event | To |
|---|---|---|
| — | first `patient:join` | `typing` |
| `typing` | no update for 8 s (server sweep, every 2 s) | `idle` |
| `idle` | any `patient:update` | `typing` |
| any | `patient:submit` | `submitted` |
| `submitted` | patient edits again | `typing` (record reopens) |
| any | socket closes | `connected: false`, status decays to `idle` |

The sweep runs server-side on one timer, so every staff screen agrees on when a patient went quiet —
if each client decided locally, two nurses would see two different answers.

### Failure handling

- **Reconnect.** Exponential backoff with jitter, capped at ~8 s. On reconnect the client asks for a
  full `snapshot` rather than replaying a diff, so a missed message cannot leave a screen wrong.
- **Offline queue.** Outbound messages are queued while the socket is down and flushed on open;
  superseded `patient:update` messages are dropped, since only the newest values matter.
- **Visible degradation.** Both screens show connection state, and the staff board raises a banner
  while data may be stale — silently showing an old record is the dangerous failure mode here.
- **Heartbeat.** Ping every 30 s, terminate sockets that miss a pong. Without it, half-open
  connections behind mobile NAT would sit on the board as phantom patients.
- **Backpressure.** Frames are capped at 64 KB and malformed messages are dropped rather than
  crashing the hub.

### Transport choice

| | WebSocket (default) | SSE + POST (fallback) |
|---|---|---|
| Where | Local, Render, Fly, Railway, any container | Vercel and other serverless hosts |
| Downstream | `ws` on `/api/ws` | `GET /api/realtime/stream` |
| Upstream | Same socket | `POST /api/realtime/publish` |
| Chosen by | Default | `NEXT_PUBLIC_REALTIME_TRANSPORT=sse`, or automatically after two failed socket attempts |

The brief allows "WebSockets or any suitable real-time technology". WebSockets are the honest answer
for a duplex feed, so they are the default — but a serverless function cannot hold one open, and the
assignment also asks for a deployed URL on a platform like Vercel. Shipping both, behind one hook and
one store, resolves that without compromising either.

---

## 5. Known limits, and what production would need

Stated plainly, because the shortcuts are deliberate:

1. **Single instance.** The hub is in-process memory. Two instances would not see each other's
   sessions. The fix is one file: replace the `subscribe`/`emit` pair in `session-store.ts` with
   Redis pub/sub (or Postgres `LISTEN/NOTIFY`), keeping the same interface.
2. **No persistence.** Refresh the server and drafts are gone. Intentional for a demo handling
   medical data; production would persist submitted records only, encrypted, with an audit trail.
3. **No authentication.** `/staff` is open. Real deployment needs auth plus role checks before any
   PII crosses the wire — the mask-by-default UI is a mitigation, not a control.
4. **No automated tests.** Given the three-day window I spent the time on behaviour and
   accessibility. The natural first suite: Zod schema unit tests, a `session-store` state-machine
   test, and one Playwright spec that drives both pages in two browser contexts and asserts the
   board updates.
5. **Rate limiting.** The publish endpoint trusts its client. Production wants per-session limits.
