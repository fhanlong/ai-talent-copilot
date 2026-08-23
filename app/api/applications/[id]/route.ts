import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { APPLICATION_STAGE_VALUES } from "@/lib/recruiting";

const input = z.object({ stage: z.enum(APPLICATION_STAGE_VALUES) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = input.parse(await request.json());
    const application = await db.application.update({ where: { id }, data: { stage: data.stage } });
    await db.auditLog.create({ data: { action: "UPDATE_APPLICATION_STAGE", entityType: "Application", entityId: id, metadata: JSON.stringify({ stage: data.stage }) } });
    return NextResponse.json({ application });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "流程阶段更新失败" }, { status: 400 }); }
}
