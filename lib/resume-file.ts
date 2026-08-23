export const MAX_RESUME_BYTES = 5 * 1024 * 1024;

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain; charset=utf-8",
};

export async function extractResumeFile(file: File) {
  if (file.size > MAX_RESUME_BYTES) throw new Error("文件不能超过5MB");
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!(extension in MIME_BY_EXTENSION)) throw new Error("仅支持 PDF、DOCX 和 TXT 文件");

  const buffer = Buffer.from(await file.arrayBuffer());
  let text = "";
  if (extension === "txt") text = buffer.toString("utf8");
  if (extension === "docx") {
    const mammoth = await import("mammoth");
    text = (await mammoth.extractRawText({ buffer })).value;
  }
  if (extension === "pdf") {
    const pdf = (await import("pdf-parse")).default;
    text = (await pdf(buffer)).text;
  }

  if (text.trim().length < 20) throw new Error("未能从文件中提取到足够文本，请检查文件内容");
  return { buffer, text: text.trim(), extension, mimeType: file.type || MIME_BY_EXTENSION[extension] };
}

export function extractContactInfo(text: string) {
  const email = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0] ?? null;
  const phone = text.match(/(?<!\d)1[3-9]\d{9}(?!\d)/)?.[0] ?? null;
  return { email, phone };
}

export function redactResumeText(text: string) {
  return text
    .replace(/(?<!\d)1[3-9]\d{9}(?!\d)/g, "[手机号已隐藏]")
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[邮箱已隐藏]")
    .replace(/(?<!\d)\d{17}[\dXx](?!\d)/g, "[身份证号已隐藏]")
    .trim();
}

export function safeDownloadName(name: string) {
  return name.replace(/[\r\n"\\/]/g, "_").slice(0, 180) || "resume";
}
