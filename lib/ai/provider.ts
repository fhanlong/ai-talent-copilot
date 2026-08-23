import { z } from "zod";

export type LLMMessage = { role: "system" | "user"; content: string };
export type ProviderKind = "mock" | "openai" | "openai-compatible" | "anthropic";

export interface LLMProvider {
  readonly name: ProviderKind;
  readonly model: string;
  generateObject<T>(messages: LLMMessage[], schema: z.ZodType<T, z.ZodTypeDef, unknown>, fallback: T): Promise<T>;
}

function parseAndValidate<T>(raw: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>): T {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const parsed: unknown = JSON.parse(cleaned);
  const candidates: unknown[] = [parsed];

  // OpenAI-compatible 模型有时会在合法JSON外再包一层结果对象。
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const record = parsed as Record<string, unknown>;
    for (const key of ["result", "data", "candidate", "profile", "resume", "analysis", "output"]) {
      if (record[key] !== undefined) candidates.push(record[key]);
    }
  }

  let firstError: z.ZodError | undefined;
  for (const candidate of candidates) {
    const result = schema.safeParse(candidate);
    if (result.success) return result.data;
    firstError ??= result.error;
  }
  throw firstError ?? new Error("模型返回的JSON结构不符合要求");
}

async function fetchJSON(url: string, init: RequestInit) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(60_000) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data?.error?.message || data?.message || `HTTP ${response.status}`;
    throw new Error(`模型请求失败：${detail}`);
  }
  return data;
}

class MockProvider implements LLMProvider {
  readonly name = "mock" as const;
  readonly model = "talent-copilot-demo-v1";
  async generateObject<T>(_messages: LLMMessage[], schema: z.ZodType<T, z.ZodTypeDef, unknown>, fallback: T) {
    await new Promise((resolve) => setTimeout(resolve, 550));
    return schema.parse(fallback);
  }
}

class OpenAIResponsesProvider implements LLMProvider {
  readonly name = "openai" as const;
  readonly model = process.env.LLM_MODEL || "gpt-4.1-mini";
  private readonly apiKey = process.env.LLM_API_KEY || "";
  private readonly baseUrl = (process.env.LLM_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");

  async generateObject<T>(messages: LLMMessage[], schema: z.ZodType<T, z.ZodTypeDef, unknown>): Promise<T> {
    if (!this.apiKey) throw new Error("LLM_API_KEY 未配置");
    const system = messages.find((message) => message.role === "system")?.content || "";
    const input = messages.filter((message) => message.role === "user").map((message) => message.content).join("\n\n");
    const data = await fetchJSON(`${this.baseUrl}/responses`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: this.model,
        instructions: `${system}\n只输出一个合法JSON对象，不要使用Markdown代码块。`,
        input,
        store: false,
        text: { format: { type: "json_object" } },
      }),
    });
    const raw = data.output_text || data.output?.flatMap((item: { content?: Array<{ type?: string; text?: string }> }) => item.content || []).find((part: { type?: string }) => part.type === "output_text")?.text;
    if (!raw) throw new Error("模型未返回有效内容");
    return parseAndValidate(raw, schema);
  }
}

class OpenAICompatibleProvider implements LLMProvider {
  readonly name = "openai-compatible" as const;
  readonly model = process.env.LLM_MODEL || "glm-4-flash";
  private readonly apiKey = process.env.LLM_API_KEY || "";
  private readonly baseUrl = (process.env.LLM_BASE_URL || "https://open.bigmodel.cn/api/paas/v4").replace(/\/$/, "");

  async generateObject<T>(messages: LLMMessage[], schema: z.ZodType<T, z.ZodTypeDef, unknown>): Promise<T> {
    if (!this.apiKey) throw new Error("LLM_API_KEY 未配置");
    const data = await fetchJSON(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ model: this.model, temperature: 0.2, response_format: { type: "json_object" }, messages }),
    });
    const raw = data?.choices?.[0]?.message?.content;
    if (!raw) throw new Error("模型未返回有效内容");
    return parseAndValidate(raw, schema);
  }
}

class AnthropicProvider implements LLMProvider {
  readonly name = "anthropic" as const;
  readonly model = process.env.LLM_MODEL || "claude-sonnet-4-5";
  private readonly apiKey = process.env.LLM_API_KEY || "";
  private readonly baseUrl = (process.env.LLM_BASE_URL || "https://api.anthropic.com/v1").replace(/\/$/, "");

  async generateObject<T>(messages: LLMMessage[], schema: z.ZodType<T, z.ZodTypeDef, unknown>): Promise<T> {
    if (!this.apiKey) throw new Error("LLM_API_KEY 未配置");
    const system = messages.find((message) => message.role === "system")?.content || "";
    const data = await fetchJSON(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": this.apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        temperature: 0.2,
        system: `${system}\n只输出一个合法JSON对象，不要使用Markdown代码块。`,
        messages: messages.filter((message) => message.role === "user"),
      }),
    });
    const raw = data?.content?.find((item: { type?: string }) => item.type === "text")?.text;
    if (!raw) throw new Error("模型未返回有效内容");
    return parseAndValidate(raw, schema);
  }
}

export function getProviderConfig() {
  const provider = (process.env.LLM_PROVIDER || "mock") as ProviderKind;
  if (provider === "mock") return {
    provider,
    model: "talent-copilot-demo-v1",
    baseUrl: "本地基础规则分析",
    hasApiKey: false,
    isMock: true,
  };
  return {
    provider,
    model: process.env.LLM_MODEL || "未配置",
    baseUrl: process.env.LLM_BASE_URL || "使用Provider默认端点",
    hasApiKey: Boolean(process.env.LLM_API_KEY),
    isMock: false,
  };
}

export function getLLMProvider(): LLMProvider {
  switch (process.env.LLM_PROVIDER) {
    case "openai": return new OpenAIResponsesProvider();
    case "openai-compatible": return new OpenAICompatibleProvider();
    case "anthropic": return new AnthropicProvider();
    default: return new MockProvider();
  }
}
