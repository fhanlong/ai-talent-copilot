import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const patchSchema = z.object({ status: z.enum(["DRAFT", "ACTIVE", "CLOSED"]).optional(), department: z.string().max(50).optional(), location: z.string().max(50).optional() });

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await db.job.findUnique({ where: { id }, include: { analyses: { orderBy: { createdAt: "desc" } }, applications: { include: { candidate: true }, orderBy: { updatedAt: "desc" } }, funnels: { orderBy: { snapshotDate: "desc" }, take: 5 } } });
  if (!job) return NextResponse.json({ error: "职位不存在" }, { status: 404 });
  return NextResponse.json({ job });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = patchSchema.parse(await request.json());
    const job = await db.job.update({ where: { id }, data });
    await db.auditLog.create({ data: { action: "UPDATE_JOB", entityType: "Job", entityId: id, metadata: JSON.stringify(data) } });
    return NextResponse.json({ job });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "更新失败" }, { status: 400 }); }
}
