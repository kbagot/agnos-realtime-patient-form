"use client";

/**
 * The realtime channel, as the UI sees it: a session list, a connection state,
 * and send(). Everything below — WebSocket vs SSE, reconnects, replayed joins,
 * queued messages — is an implementation detail of this file, so no component
 * ever imports a transport directly.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import {
  isServerMessage,
  type ClientMessage,
  type ConnectionState,
  type PatientSession,
  type ServerMessage,
} from "@/lib/realtime/protocol";

export type RealtimeTransport = "websocket" | "sse";

export interface UseRealtimeOptions {
  /**
   * Replayed after every successful (re)connect so the server relearns who this
   * client is — the patient's `patient:join`, the staff view's `staff:join`.
   * Callers never send it themselves: the WebSocket replays it on open and the
   * SSE fallback expresses it in the stream URL, so doing both would double-
   * count the socket.
   */
  onReconnect?: ClientMessage | null;
  /** Stay disconnected while false (e.g. before a session id exists). */
  enabled?: boolean;
}

export interface UseRealtimeResult {
  sessions: PatientSession[];
  connection: ConnectionState;
  transport: RealtimeTransport;
  send: (message: ClientMessage) => void;
  /** Clock of the last frame received — lets the UI show "live N seconds ago". */
  lastServerTime: number;
}

const WS_PATH = "/api/ws";
const SSE_PATH = "/api/realtime/stream";
const PUBLISH_PATH = "/api/realtime/publish";

const BASE_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 8_000;
/** Two failed handshakes is enough evidence that upgrades don't work here. */
const WS_FAILURE_LIMIT = 2;
/** A socket that dies sooner than this never really worked (proxy killed it). */
const WS_MIN_HEALTHY_MS = 3_000;
/** Bounded so an offline tab cannot grow the queue without limit. */
const MAX_QUEUED = 50;

/** Vercel and friends cannot hold a socket, so deploys set this to "sse". */
function sseForcedByEnv(): boolean {
  return process.env.NEXT_PUBLIC_REALTIME_TRANSPORT === "sse";
}

function websocketUrl(): string {
  const override = process.env.NEXT_PUBLIC_WS_URL;
  if (override) return override;
  const scheme = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${scheme}//${window.location.host}${WS_PATH}`;
}

/**
 * Order is insertion order, deliberately: the staff table decides how to sort,
 * and re-sorting on every keystroke would make rows jump under the cursor.
 */
function reduce(list: PatientSession[], message: ServerMessage): PatientSession[] {
  switch (message.type) {
    case "snapshot":
      return message.sessions;
    case "session:upsert": {
      const index = list.findIndex((session) => session.id === message.session.id);
      if (index === -1) return [...list, message.session];
      const next = list.slice();
      next[index] = message.session;
      return next;
    }
    case "session:remove":
      return list.filter((session) => session.id !== message.sessionId);
    default:
      return list;
  }
}

function enqueue(queue: ClientMessage[], message: ClientMessage): void {
  if (message.type === "patient:update") {
    // Only the newest draft matters; replaying stale keystrokes on reconnect
    // would make the staff view rewind before catching up.
    for (let i = queue.length - 1; i >= 0; i -= 1) {
      const queued = queue[i];
      if (queued.type === "patient:update" && queued.sessionId === message.sessionId) {
        queue.splice(i, 1);
      }
    }
  }
  queue.push(message);
  if (queue.length > MAX_QUEUED) queue.splice(0, queue.length - MAX_QUEUED);
}

export function useRealtime(options: UseRealtimeOptions = {}): UseRealtimeResult {
  const { onReconnect, enabled = true } = options;

  const [sessions, setSessions] = useState<PatientSession[]>([]);
  const [liveConnection, setConnection] = useState<ConnectionState>("connecting");
  const [transport, setTransport] = useState<RealtimeTransport>(() =>
    sseForcedByEnv() ? "sse" : "websocket",
  );
  const [lastServerTime, setLastServerTime] = useState(0);

  // Read through a ref so a caller passing an inline object literal doesn't
  // tear the connection down on every render. Only ever read from a socket
  // callback, so a commit-time write is early enough.
  const reconnectRef = useRef<ClientMessage | null | undefined>(onReconnect);
  useEffect(() => {
    reconnectRef.current = onReconnect;
  });

  const queueRef = useRef<ClientMessage[]>([]);
  const deliverRef = useRef<((message: ClientMessage) => boolean) | null>(null);
  // Survives effect re-runs (and StrictMode's double mount): once we know
  // upgrades are impossible on this page load, never try one again.
  const sseOnlyRef = useRef(sseForcedByEnv());

  // The SSE stream binds the patient session to its own lifecycle, so the id has
  // to be part of its URL — which makes it a genuine connection dependency: a
  // patient starting over reconnects under the new id.
  const joinSessionId = onReconnect?.type === "patient:join" ? onReconnect.sessionId : null;

  const send = useCallback((message: ClientMessage) => {
    const deliver = deliverRef.current;
    if (deliver && deliver(message)) return;
    enqueue(queueRef.current, message);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let disposed = false;
    let socket: WebSocket | null = null;
    let source: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    let wsFailures = 0;

    const ingest = (raw: string): void => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return;
      }
      if (!isServerMessage(parsed)) return;
      const message = parsed;
      setSessions((current) => reduce(current, message));
      if ("serverTime" in message && typeof message.serverTime === "number") {
        setLastServerTime(message.serverTime);
      }
    };

    const flush = (): void => {
      const queue = queueRef.current;
      while (queue.length > 0) {
        const deliver = deliverRef.current;
        if (!deliver || !deliver(queue[0])) return;
        queue.shift();
      }
    };

    const scheduleRetry = (): void => {
      if (disposed || retryTimer !== null) return;
      setConnection("reconnecting");
      const ceiling = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** attempt);
      attempt += 1;
      // Half fixed, half jittered — spreads a thundering herd after a restart.
      const delay = ceiling / 2 + Math.random() * (ceiling / 2);
      retryTimer = setTimeout(() => {
        retryTimer = null;
        connect();
      }, delay);
    };

    const post = async (message: ClientMessage): Promise<void> => {
      try {
        const response = await fetch(PUBLISH_PATH, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(message),
          keepalive: true,
        });
        // A 4xx means the server refused this message on purpose; retrying it
        // would loop forever. Only transport-level failures are worth requeuing.
        if (!response.ok && response.status >= 500) throw new Error(String(response.status));
      } catch {
        if (!disposed) enqueue(queueRef.current, message);
      }
    };

    const openSse = (): void => {
      const url = new URL(SSE_PATH, window.location.href);
      if (joinSessionId) url.searchParams.set("sessionId", joinSessionId);

      const stream = new EventSource(url.toString());
      source = stream;
      setConnection(attempt === 0 ? "connecting" : "reconnecting");

      stream.onopen = () => {
        if (disposed) {
          stream.close();
          return;
        }
        attempt = 0;
        setConnection("open");
        deliverRef.current = (message) => {
          void post(message);
          return true;
        };
        // onReconnect is deliberately not replayed here: the stream URL already
        // carries the patient session and the server pushes a snapshot as its
        // first frame, so a POSTed join would only double-count the socket.
        flush();
      };

      stream.onmessage = (event: MessageEvent<string>) => ingest(event.data);

      stream.onerror = () => {
        deliverRef.current = null;
        if (disposed) return;
        // EventSource retries on its own, but without jitter and without
        // re-running our join, so we own reconnection instead.
        stream.close();
        source = null;
        scheduleRetry();
      };
    };

    const fallbackToSse = (): void => {
      sseOnlyRef.current = true;
      setTransport("sse");
      attempt = 0;
      openSse();
    };

    const openWebSocket = (): void => {
      let ws: WebSocket;
      try {
        ws = new WebSocket(websocketUrl());
      } catch {
        wsFailures += 1;
        if (wsFailures >= WS_FAILURE_LIMIT) fallbackToSse();
        else scheduleRetry();
        return;
      }

      socket = ws;
      setConnection(attempt === 0 ? "connecting" : "reconnecting");
      let openedAt = 0;

      ws.onopen = () => {
        if (disposed) {
          ws.close(1000, "unmounted");
          return;
        }
        openedAt = Date.now();
        attempt = 0;
        setConnection("open");
        deliverRef.current = (message) => {
          if (ws.readyState !== WebSocket.OPEN) return false;
          ws.send(JSON.stringify(message));
          return true;
        };
        // The server answers a fresh connection with a snapshot, so this only
        // has to re-announce who we are; the resync comes for free.
        const rejoin = reconnectRef.current;
        if (rejoin) deliverRef.current(rejoin);
        flush();
      };

      ws.onmessage = (event: MessageEvent<string>) => {
        if (typeof event.data === "string") ingest(event.data);
      };

      ws.onclose = (event: CloseEvent) => {
        deliverRef.current = null;
        socket = null;
        if (disposed) return;
        const shortLived = openedAt !== 0 && Date.now() - openedAt < WS_MIN_HEALTHY_MS;
        const clean = event.code === 1000 || event.code === 1001;
        // A socket that never opened, or that a proxy killed seconds in, counts
        // against upgrades working at all. A long-lived one that drops is just
        // a restart — keep the transport and reconnect.
        if (openedAt === 0 || (shortLived && !clean)) wsFailures += 1;
        else wsFailures = 0;

        if (wsFailures >= WS_FAILURE_LIMIT) fallbackToSse();
        else scheduleRetry();
      };
    };

    function connect(): void {
      if (disposed) return;
      if (sseOnlyRef.current) openSse();
      else openWebSocket();
    }

    connect();

    return () => {
      disposed = true;
      deliverRef.current = null;
      if (retryTimer !== null) clearTimeout(retryTimer);
      if (socket) {
        // Detach first: a close we asked for must not be read as a failure.
        socket.onopen = socket.onmessage = socket.onerror = socket.onclose = null;
        if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
          socket.close(1000, "unmounted");
        }
        socket = null;
      }
      if (source) {
        source.onopen = source.onmessage = source.onerror = null;
        source.close();
        source = null;
      }
      setConnection("closed");
    };
  }, [enabled, joinSessionId]);

  // Derived rather than stored: a disabled hook is closed by definition, and
  // computing it here keeps the effect free of synchronous state writes.
  const connection: ConnectionState = enabled ? liveConnection : "closed";

  return { sessions, connection, transport, send, lastServerTime };
}
