/**
 * SSE fallback for the server→client half of the realtime channel.
 *
 * Used when a WebSocket cannot be held open — a serverless deploy, a corporate
 * proxy that strips upgrades, or a browser that failed the handshake twice.
 * The client→server half is POST /api/realtime/publish.
 */
import { snapshot, subscribe, joinPatient, leavePatient } from "@/server/session-store";
import { asSessionId } from "@/server/apply-message";
import type { ServerMessage } from "@/lib/realtime/protocol";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Well under the 30–60s idle timeout of every proxy we might sit behind. */
const KEEPALIVE_MS = 15_000;

export function GET(request: Request): Response {
  // Patients pass their session here rather than over the POST channel: this
  // stream is the connection, so binding join/leave to its lifecycle is the
  // only way the store can tell a live patient from an abandoned one.
  const sessionId = asSessionId(new URL(request.url).searchParams.get("sessionId"));

  const encoder = new TextEncoder();
  let closed = false;
  let unsubscribe: (() => void) | null = null;
  let keepalive: ReturnType<typeof setInterval> | null = null;

  const cleanup = (): void => {
    if (closed) return;
    closed = true;
    if (keepalive) clearInterval(keepalive);
    unsubscribe?.();
    if (sessionId) leavePatient(sessionId);
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const write = (chunk: string): void => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // Consumer went away between the abort signal and this write.
          cleanup();
        }
      };
      const send = (message: ServerMessage): void => write(`data: ${JSON.stringify(message)}\n\n`);

      send(snapshot());
      // Subscribe before joining so this client also receives its own upsert.
      unsubscribe = subscribe(send);
      if (sessionId) joinPatient(sessionId);

      keepalive = setInterval(() => write(": keepalive\n\n"), KEEPALIVE_MS);

      request.signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {
          // Already closed by the runtime.
        }
      });
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Stops nginx and friends from buffering the stream into uselessness.
      "X-Accel-Buffering": "no",
    },
  });
}
