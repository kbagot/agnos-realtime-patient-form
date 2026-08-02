/**
 * Custom Node server: Next.js for everything HTTP, plus a WebSocket endpoint on
 * /api/ws for the live patient↔staff channel.
 *
 * A route handler cannot own a raw socket, so the duplex transport has to live
 * outside Next. Both this server and the SSE route drive the same in-process
 * session store (see src/server/session-store.ts), which is why the two
 * transports are interchangeable.
 *
 * Run with tsx — this file is never bundled by Next.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { Duplex } from "node:stream";

import next from "next";
import { WebSocketServer, type RawData, type WebSocket } from "ws";

import type { ClientMessage, ServerMessage } from "./src/lib/realtime/protocol";
import { applyClientMessage, parseClientMessage } from "./src/server/apply-message";
import { leavePatient, snapshot, subscribe } from "./src/server/session-store";

const WS_PATH = "/api/ws";
const HEARTBEAT_MS = 30_000;
/** Refuse frames larger than this; the biggest legitimate one is a full form. */
const MAX_FRAME_BYTES = 64 * 1024;

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const hostname = process.env.HOSTNAME ?? "0.0.0.0";
const dev = process.env.NODE_ENV !== "production";

interface SocketState {
  /** Cleared on every pong; a socket still unmarked at the next sweep is dead. */
  alive: boolean;
  /** Set once the peer identifies as a patient, so close() can release its slot. */
  patientSessionId: string | null;
  unsubscribe: () => void;
}

/**
 * Next 16 installs its own "upgrade" listener the first time it handles a
 * request, and that listener claims *every* upgrade — including ours. Its
 * public `getUpgradeHandler()` is a no-op on this class, so the working handler
 * is only reachable through that auto-registration. Handing Next a server that
 * never listens lets it register there instead of on the real one; we then
 * forward everything except /api/ws to it, and HMR keeps working in dev.
 */
const nextUpgrades = createServer();

const app = next({ dev, hostname, port, httpServer: nextUpgrades });

const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_FRAME_BYTES });
const state = new WeakMap<WebSocket, SocketState>();

function push(socket: WebSocket, message: ServerMessage): void {
  if (socket.readyState !== socket.OPEN) return;
  try {
    socket.send(JSON.stringify(message));
  } catch {
    // Send failures always surface again as a close event; nothing to do here.
  }
}

function decode(data: RawData): unknown {
  try {
    return JSON.parse(typeof data === "string" ? data : data.toString("utf8")) as unknown;
  } catch {
    return null;
  }
}

function onMessage(socket: WebSocket, data: RawData): void {
  const message: ClientMessage | null = parseClientMessage(decode(data));
  if (!message) return;

  const entry = state.get(socket);
  // Remember the session so an abrupt disconnect still decrements its socket
  // count — otherwise the staff view would show a ghost patient as connected.
  if (entry && message.type === "patient:join") entry.patientSessionId = message.sessionId;
  if (entry && message.type === "patient:reset") entry.patientSessionId = null;

  const reply = applyClientMessage(message);
  if (reply) push(socket, reply);
}

function onClose(socket: WebSocket): void {
  const entry = state.get(socket);
  if (!entry) return;
  state.delete(socket);
  entry.unsubscribe();
  if (entry.patientSessionId) leavePatient(entry.patientSessionId);
}

wss.on("connection", (socket: WebSocket) => {
  const unsubscribe = subscribe((message) => push(socket, message));
  state.set(socket, { alive: true, patientSessionId: null, unsubscribe });

  // Snapshot first: a late joiner must see the world before any delta arrives.
  push(socket, snapshot());

  socket.on("message", (data: RawData) => onMessage(socket, data));
  socket.on("pong", () => {
    const entry = state.get(socket);
    if (entry) entry.alive = true;
  });
  socket.on("error", () => socket.terminate());
  socket.on("close", () => onClose(socket));
});

// A half-open TCP connection (laptop lid closed, tunnel dropped) never fires
// close, so liveness has to be probed rather than waited for.
const heartbeat = setInterval(() => {
  for (const socket of wss.clients) {
    const entry = state.get(socket);
    if (!entry) continue;
    if (!entry.alive) {
      socket.terminate();
      continue;
    }
    entry.alive = false;
    socket.ping();
  }
}, HEARTBEAT_MS);
heartbeat.unref();

async function main(): Promise<void> {
  await app.prepare();
  // Throws if resolved before prepare() has run.
  const handleRequest = app.getRequestHandler();

  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    void handleRequest(req, res).catch((error: unknown) => {
      console.error("[server] request failed", error);
      res.statusCode = 500;
      res.end("Internal Server Error");
    });
  });

  server.on("upgrade", (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    // Only claim our own endpoint — Next owns /_next/* for HMR in dev.
    const { pathname } = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    if (pathname !== WS_PATH) {
      // Next registers lazily, on its first request; nothing else can serve an
      // upgrade that arrives before that, so fail it fast instead of hanging.
      if (nextUpgrades.listenerCount("upgrade") === 0) socket.destroy();
      else nextUpgrades.emit("upgrade", req, socket, head);
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
  });

  server.listen(port, () => {
    console.log(`> ready on http://localhost:${port} (${dev ? "development" : "production"})`);
    console.log(`> websocket on ws://localhost:${port}${WS_PATH}`);
  });

  const shutdown = (): void => {
    clearInterval(heartbeat);
    for (const socket of wss.clients) socket.close(1001, "server shutting down");
    server.close(() => process.exit(0));
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

void main().catch((error: unknown) => {
  console.error("[server] failed to start", error);
  process.exit(1);
});
