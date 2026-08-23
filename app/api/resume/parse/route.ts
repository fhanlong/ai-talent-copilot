import { NextResponse } from "next/server";
import { parseResumeWithAI } from "@/lib/ai/service";
import { extractContactInfo, extractResumeFile, redactResumeText } from "@/lib/resume-file";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const data = await request.formData();
    const file = data.get("file");
    const anonymize = data.get("anonymize") === "true";
    if (!(file instanceof File)) return NextResponse.json({ error: "请选择简历文件" }, { status: 400 });
    const extracted = await extractResumeFile(file);
    const contact = extractContactInfo(extracted.text);
    const cleaned = redactResumeText(extracted.text);

    return NextResponse.json({ ...(await parseResumeWithAI(cleaned, { anonymize })), extractedText: cleaned, fileName: file.name, contact, privacy: { anonymized: anonymize, contactStoredOnlyOnSave: true } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "简历解析失败" }, { status: 500 });
  }
}
