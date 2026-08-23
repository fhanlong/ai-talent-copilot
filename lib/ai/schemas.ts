import { z } from "zod";

function toTextList(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (typeof item === "string") return item.trim() ? [item.trim()] : [];
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        const text = record.name ?? record.skill ?? record.title ?? record.description;
        return typeof text === "string" && text.trim() ? [text.trim()] : [];
      }
      return [];
    });
  }
  if (typeof value === "string") {
    return value.split(/[、，,；;\n]/).map((item) => item.trim()).filter(Boolean);
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) => {
      if (typeof item === "string") return item.trim() ? [item.trim()] : [];
      if (item === true) return [key];
      if (Array.isArray(item)) return toTextList(item) as string[];
      return [];
    });
  }
  return [];
}

function normalizeCandidate(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const source = value as Record<string, unknown>;
  const basic = source.basicInfo && typeof source.basicInfo === "object"
    ? source.basicInfo as Record<string, unknown>
    : {};
  return {
    displayName: source.displayName ?? source.name ?? basic.displayName ?? basic.name,
    currentRole: source.currentRole ?? source.role ?? source.position ?? basic.currentRole ?? basic.position,
    yearsOfExperience: source.yearsOfExperience ?? source.experienceYears ?? source.workYears ?? basic.yearsOfExperience,
    education: source.education ?? source.educationBackground ?? basic.education,
    skills: source.skills ?? source.skillSet ?? source.coreSkills,
    highlights: source.highlights ?? source.achievements ?? source.strengths,
  };
}

export const jdAnalysisSchema = z.object({
  jobTitle: z.string(),
  jobType: z.string(),
  summary: z.string(),
  competencies: z.array(z.object({ name: z.string(), description: z.string(), importance: z.number().int().min(1).max(5) })),
  mustHave: z.array(z.string()),
  preferred: z.array(z.string()),
  interviewFocus: z.array(z.string()),
  ambiguities: z.array(z.string()),
});

export const candidateSchema = z.object({
  displayName: z.string(),
  currentRole: z.string(),
  yearsOfExperience: z.number().min(0),
  education: z.string(),
  skills: z.array(z.string()),
  highlights: z.array(z.string()),
  resumeText: z.string(),
});

// 模型只负责抽取结构化字段；简历原文由服务端补回，避免模型复述或改写原文。
// 这里兼容 OpenAI-compatible 模型常见的轻微类型偏差，但最终仍输出统一结构。
export const candidateExtractionSchema = z.preprocess(normalizeCandidate, z.object({
  displayName: z.string().catch("姓名待确认"),
  currentRole: z.string().catch("待确认"),
  yearsOfExperience: z.preprocess((value) => {
    if (typeof value === "string") {
      const match = value.match(/\d+(?:\.\d+)?/);
      return match ? Number(match[0]) : 0;
    }
    return value;
  }, z.number().min(0)).catch(0),
  education: z.preprocess((value) => {
    if (Array.isArray(value)) {
      return value.map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const record = item as Record<string, unknown>;
          return [record.school, record.degree, record.major].filter((part) => typeof part === "string").join(" · ");
        }
        return "";
      }).filter(Boolean).join("；");
    }
    return value;
  }, z.string()).catch("待确认"),
  skills: z.preprocess(toTextList, z.array(z.string())).catch([]),
  highlights: z.preprocess(toTextList, z.array(z.string())).catch([]),
}));

export const matchSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  competencyScore: z.number().int().min(0).max(100),
  experienceScore: z.number().int().min(0).max(100),
  industryScore: z.number().int().min(0).max(100),
  mustHaveScore: z.number().int().min(0).max(100),
  strengths: z.array(z.string()),
  risks: z.array(z.string()),
  missingInformation: z.array(z.string()),
  evidence: z.array(z.object({ conclusion: z.string(), quote: z.string(), confidence: z.enum(["高", "中", "低"]) })),
  interviewSuggestions: z.array(z.string()),
  summary: z.string(),
});

export const interviewSchema = z.object({
  duration: z.number().int(),
  opening: z.string(),
  questions: z.array(z.object({
    question: z.string(), competency: z.string(), why: z.string(),
    followUps: z.array(z.string()), positiveSignals: z.array(z.string()), riskSignals: z.array(z.string()),
  })),
  evaluationDimensions: z.array(z.object({ name: z.string(), guidance: z.string(), weight: z.number().int() })),
});

export const funnelAnalysisSchema = z.object({
  bottleneck: z.string(),
  conversionRate: z.number().int().min(0).max(100),
  lostCount: z.number().int().min(0),
  severity: z.enum(["高风险", "需关注", "相对健康"]),
  possibleCauses: z.array(z.string()),
  recommendations: z.array(z.string()),
  summary: z.string(),
});
