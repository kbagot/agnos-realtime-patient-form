/**
 * Client→server half of the SSE fallback: one ClientMessage per POST.
 *
 * Chatty compared to a socket, but the patient form already coalesces
 * keystrokes (UPDATE_THROTTLE_MS), so this stays at a handful of requests per
 * second per patient.
 */
import { applyClientMessage, parseClientMessage } from "@/server/apply-message";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function rejected(reason: string): Response {
  return Response.json({ ok: false, reason }, { status: 400 });
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return rejected("Body must be JSON");
  }

  const message = parseClientMessage(body);
  if (!message) return rejected("Not a well-formed ClientMessage");

  // Over SSE the join is expressed by the stream URL, because only the stream
  // has a close event to pair it with. Accepting it here would leak a socket
  // slot and leave the patient permanently "connected" in the staff view.
  if (message.type === "patient:join") {
    return rejected("patient:join belongs in the /api/realtime/stream query string");
  }

  applyClientMessage(message);
  return Response.json({ ok: true });
}
