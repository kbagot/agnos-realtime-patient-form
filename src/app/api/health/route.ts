import { NextResponse } from "next/server";

/** Liveness probe for the host (Render health check, uptime pings). */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    ok: true,
    transport: process.env.NEXT_PUBLIC_REALTIME_TRANSPORT ?? "websocket",
    uptimeSeconds: Math.round(process.uptime()),
  });
}
