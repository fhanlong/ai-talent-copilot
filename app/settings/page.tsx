"use client";

import { useEffect, useState } from "react";
import { Bot, CheckCircle2, Copy, KeyRound, RefreshCw, Server, ShieldCheck, XCircle } from "lucide-react";
import { PageHeader } from "@/components/ui";

type Config = { provider: string; model: string; baseUrl: string; hasApiKey: boolean; isMock: boolean };

const samples: Record<string, string> = {
  deepseek: `LLM_PROVIDER="openai-compatible"\nLLM_API_KEY="your-deepseek-key"\nLLM_BASE_URL="https://api.deepseek.com"\nLLM_MODEL="deepseek-chat"`,
  openai: `LLM_PROVIDER="openai"\nLLM_API_KEY="your-key"\nLLM_BASE_URL="https://api.openai.com/v1"\nLLM_MODEL="gpt-4.1-mini"`,
  "openai-compatible": `LLM_PROVIDER="openai-compatible"\nLLM_API_KEY="your-key"\nLLM_BASE_URL="https://open.bigmodel.cn/api/paas/v4"\nLLM_MODEL="glm-4-flash"`,
  anthropic: `LLM_PROVIDER="anthropic"\nLLM_API_KEY="your-key"\nLLM_BASE_URL="https://api.anthropic.com/v1"\nLLM_MODEL="claude-sonnet-4-5"`,
};

export default function SettingsPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [selected, setSelected] = useState("deepseek");

  useEffect(() => { void fetch("/api/settings/provider").then((response) => response.json()).then(setConfig); }, []);
  async function test() {
    setTesting(true); setResult(null);
    try {
      const response = await fetch("/api/settings/provider", { method: "POST" });
      const data = await response.json();
      setResult({ ok: response.ok, message: response.ok ? data.result.message : data.error });
    } catch { setResult({ ok: false, message: "无法访问服务端配置接口" }); }
    finally { setTesting(false); }
  }

  return <div className="fade-up"><PageHeader eyebrow="Workspace Settings" title="模型与安全设置" description="模型密钥仅通过服务端环境变量配置。本页面只显示状态，不读取、不回传也不保存密钥。" />
    <div className="grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
      <section className="space-y-5"><div className="panel p-5"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600"><Bot size={19}/></div><div><h2 className="font-semibold">当前模型Provider</h2><p className="mt-0.5 text-xs text-[#7b8781]">服务端运行状态</p></div></div><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${config?.isMock?"bg-[#fff3df] text-[#9b6a24]":"bg-brand-50 text-brand-700"}`}>{config?.isMock?"Demo模式":"真实模型"}</span></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2"><Status icon={Server} label="Provider" value={config?.provider||"加载中"}/><Status icon={Bot} label="模型" value={config?.model||"加载中"}/><Status icon={KeyRound} label="API Key" value={config?.isMock?"Mock无需密钥":config?.hasApiKey?"已配置":"未配置"}/><Status icon={ShieldCheck} label="密钥位置" value="仅服务端环境变量"/></div>
        <button onClick={test} disabled={testing} className="btn-primary mt-5"><RefreshCw size={15} className={testing?"animate-spin":""}/>{testing?"正在测试…":"测试模型连接"}</button>
        {result&&<div className={`mt-4 flex items-center gap-2 rounded-xl px-4 py-3 text-xs ${result.ok?"bg-brand-50 text-brand-700":"bg-[#fff3f1] text-[#a64f45]"}`}>{result.ok?<CheckCircle2 size={15}/>:<XCircle size={15}/>} {result.message}</div>}
      </div>
      <div className="panel p-5"><h2 className="font-semibold">隐私与模型调用</h2><div className="mt-4 space-y-3 text-xs leading-6 text-[#66736c]"><p>• 解析请求不会自动保存文件；HR主动保存候选人后，原始简历会写入本地SQLite。</p><p>• 手机号、邮箱和身份证号在模型调用前进行基础脱敏；电话和邮箱仅用于招聘联系。</p><p>• 候选人详情默认遮罩联系方式，主动查看与简历下载会写入审计日志。</p><p>• OpenAI分支设置 <code className="rounded bg-[#eef2ef] px-1.5 py-0.5">store: false</code>，避免将响应用于服务端会话延续。</p><p>• 生产环境还需根据所在企业的数据处理协议和招聘合规要求完成评估。</p></div></div></section>
      <section className="panel p-5"><h2 className="font-semibold">切换真实模型</h2><p className="mt-1 text-xs leading-5 text-[#78847e]">选择Provider，复制配置到项目根目录的 .env，然后重启开发服务。</p><div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">{[{id:"deepseek",l:"DeepSeek"},{id:"openai",l:"OpenAI"},{id:"openai-compatible",l:"GLM/兼容"},{id:"anthropic",l:"Claude"}].map(x=><button key={x.id} onClick={()=>setSelected(x.id)} className={`rounded-xl border px-2 py-2.5 text-xs font-semibold ${selected===x.id?"border-brand-500 bg-brand-50 text-brand-700":"border-[#dfe5e1] text-[#65726b]"}`}>{x.l}</button>)}</div><div className="relative mt-4 rounded-xl bg-[#17221d] p-4"><button title="复制配置" onClick={()=>navigator.clipboard.writeText(samples[selected])} className="absolute right-3 top-3 rounded-lg bg-white/10 p-2 text-white/70 hover:text-white"><Copy size={14}/></button><pre className="overflow-auto whitespace-pre-wrap pr-8 text-[11px] leading-6 text-[#d4e6dc]">{samples[selected]}</pre></div><div className="mt-4 rounded-xl border border-[#e6e0cf] bg-[#fffaf0] p-3 text-[11px] leading-5 text-[#77694b]">不要把真实API Key提交到Git。修改环境变量后必须停止并重新运行开发服务。</div></section>
    </div>
  </div>;
}

function Status({icon:Icon,label,value}:{icon:typeof Server;label:string;value:string}){return <div className="rounded-xl bg-[#f7f9f8] p-3"><Icon size={14} className="text-[#78857e]"/><p className="mt-2 text-[10px] text-[#89948e]">{label}</p><p className="mt-1 truncate text-xs font-semibold">{value}</p></div>}
