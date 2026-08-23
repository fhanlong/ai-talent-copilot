import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthEnabled } from "@/lib/auth";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, database: "connected", authEnabled: isAuthEnabled(), timestamp: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ ok: false, database: "error", error: error instanceof Error ? error.message : "health check failed" }, { status: 503 });
  }
}
