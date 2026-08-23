"use client";

import { useState } from "react";
import { AlertCircle, Check, FileText, RotateCcw, Save, Sparkles, Target } from "lucide-react";
import { useAppStore } from "@/components/app-store";
import { AiNotice, EmptyState, LoadingState, PageHeader, SignalList } from "@/components/ui";
import type { JDAnalysis } from "@/lib/types";
import { DEMO_JD } from "@/lib/demo-data";

export default function JDAnalysisPage() {
  const { jdText, setJdText, jdAnalysis, setJdAnalysis, setMatch } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [meta, setMeta] = useState("Mock Provider · Demo模式");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function analyze() {
    setError("");
    if (jdText.trim().length < 30) { setError("请补充更完整的职位描述，至少30个字符。"); return; }
    setLoading(true);
    try {
      const response = await fetch("/api/ai/jd", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: jdText }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "分析失败");
      setJdAnalysis(data.result as JDAnalysis);
      setMatch(null);
      setMeta(`${data.meta.provider} · ${data.meta.model}`);
    } catch (e) { setError(e instanceof Error ? e.message : "分析失败，请稍后重试"); }
    finally { setLoading(false); }
  }

  async function saveAnalysis() {
    if (!jdAnalysis) return;
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ description: jdText, analysis: jdAnalysis }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "保存失败");
      setSaved(true); setTimeout(() => setSaved(false), 1800);
    } catch (e) { setError(e instanceof Error ? e.message : "保存失败"); }
    finally { setSaving(false); }
  }

  return (
    <div className="fade-up">
      <PageHeader eyebrow="Job Intelligence" title="JD 智能分析" description="将自然语言职位需求拆解为可校正、可用于筛选和面试的结构化能力画像。" action={<button className="btn-secondary" onClick={() => { setJdText(DEMO_JD); setJdAnalysis(null); }}><RotateCcw size={15} /> 载入示例</button>} />
      <div className="grid gap-6 xl:grid-cols-[.86fr_1.14fr]">
        <section className="panel flex min-h-[680px] flex-col p-5">
          <div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold">职位描述</h2><p className="mt-1 text-xs text-[#7e8a84]">输入职责、要求及业务背景，信息越具体越好</p></div><span className="badge"><FileText size={12} className="mr-1" />文本输入</span></div>
          <textarea aria-label="职位描述" value={jdText} onChange={(e) => setJdText(e.target.value)} className="input min-h-[470px] flex-1 resize-none !leading-7" placeholder="在此粘贴职位JD…" />
          <div className="mt-2 flex items-center justify-between text-[11px] text-[#909a95]"><span>建议包含职位目标、职责、经验与技能要求</span><span>{jdText.length} / 16,000</span></div>
          {error && <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#fff3f1] px-3 py-2 text-xs text-[#a84d43]"><AlertCircle size={14} />{error}</div>}
          <button className="btn-primary mt-4 w-full" disabled={loading} onClick={analyze}><Sparkles size={16} />{loading ? "正在理解职位…" : "开始 AI 分析"}</button>
          <div className="mt-4"><AiNotice compact /></div>
        </section>

        <section>
          {loading ? <div className="panel p-5"><LoadingState label="正在提取职位能力、关键词与面试关注点…" /></div> : jdAnalysis ? <AnalysisResult analysis={jdAnalysis} meta={meta} onSave={saveAnalysis} saving={saving} saved={saved} /> : <EmptyState title="等待分析职位" description="左侧输入JD后，AI将在这里生成结构化职位画像" />}
        </section>
      </div>
    </div>
  );
}

function AnalysisResult({ analysis, meta, onSave, saving, saved }: { analysis: JDAnalysis; meta: string; onSave: () => void; saving: boolean; saved: boolean }) {
  return <div className="space-y-5">
    <div className="panel overflow-hidden">
      <div className="border-b border-[#e9eeeb] bg-gradient-to-r from-[#f3faf6] to-white p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="mb-2 flex items-center gap-2"><span className="rounded-full bg-brand-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">AI 画像</span><span className="text-[11px] text-[#839089]">{meta}</span></div><h2 className="text-xl font-bold">{analysis.jobTitle}</h2><p className="mt-1 text-sm text-brand-700">{analysis.jobType}</p></div><button disabled={saving} onClick={onSave} className="btn-secondary !px-3 !py-2"><Save size={14} /> {saving ? "保存中…" : saved ? "已保存" : "保存画像"}</button></div><p className="mt-4 max-w-3xl text-sm leading-6 text-[#5f6d65]">{analysis.summary}</p></div>
      <div className="p-5"><div className="mb-4 flex items-center gap-2"><Target size={17} className="text-brand-600" /><h3 className="text-sm font-semibold">职位核心能力</h3></div><div className="space-y-3">{analysis.competencies.map((item, i) => <div key={item.name} className="rounded-xl border border-[#e7ebe8] p-4"><div className="flex items-start gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#f0f4f1] text-xs font-bold text-[#68766e]">{i + 1}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">{item.name}</p><div aria-label={`重要程度${item.importance}星`} className="flex gap-1">{[1,2,3,4,5].map(s => <span key={s} className={`size-1.5 rounded-full ${s <= item.importance ? "bg-brand-500" : "bg-[#dfe5e1]"}`} />)}</div></div><p className="mt-1 text-xs leading-5 text-[#748078]">{item.description}</p></div></div></div>)}</div></div>
    </div>
    <div className="grid gap-5 md:grid-cols-2"><div className="panel p-5"><h3 className="mb-4 text-sm font-semibold">必须条件</h3><div className="flex flex-wrap gap-2">{analysis.mustHave.map(x => <span key={x} className="rounded-lg border border-brand-100 bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-700">{x}</span>)}</div></div><div className="panel p-5"><h3 className="mb-4 text-sm font-semibold">加分条件</h3><div className="flex flex-wrap gap-2">{analysis.preferred.map(x => <span key={x} className="rounded-lg border border-[#e3e6ef] bg-[#f6f7fb] px-2.5 py-1.5 text-xs font-medium text-[#5f6980]">{x}</span>)}</div></div></div>
    <div className="panel p-5"><h3 className="mb-4 text-sm font-semibold">面试重点验证</h3><SignalList items={analysis.interviewFocus} /></div>
    <div className="rounded-2xl border border-[#eee3c9] bg-[#fcf9f1] p-5"><div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#86662e]"><AlertCircle size={16} />JD 信息缺口</div><SignalList items={analysis.ambiguities} tone="neutral" /></div>
    <div className="flex items-center gap-2 rounded-xl bg-[#f3faf6] px-4 py-3 text-xs text-[#5f7067]"><Check size={15} className="text-brand-600" />画像已生成。进入简历匹配前，建议由HR确认能力权重与必须条件。</div>
  </div>;
}
