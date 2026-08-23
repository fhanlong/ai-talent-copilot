import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const candidate = await db.candidate.findUnique({ where: { id }, select: { email: true, phone: true } });
  if (!candidate) return NextResponse.json({ error: "候选人不存在" }, { status: 404 });
  await db.auditLog.create({ data: { action: "VIEW_CANDIDATE_CONTACT", entityType: "Candidate", entityId: id } });
  return NextResponse.json(candidate, { headers: { "Cache-Control": "no-store" } });
}
