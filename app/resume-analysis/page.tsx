"use client";

import { ChangeEvent, useRef, useState } from "react";
import { AlertCircle, ArrowRight, Briefcase, FileText, GitMerge, GraduationCap, Printer, Save, ShieldCheck, Sparkles, UploadCloud, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useAppStore } from "@/components/app-store";
import { AiNotice, EmptyState, LoadingState, PageHeader, ScoreRing, SignalList } from "@/components/ui";
import { getMatchAssessment } from "@/lib/match-assessment";
import type { CandidateProfile, MatchAnalysis } from "@/lib/types";

type ProviderMeta = { provider: string; model: string };
type DuplicateCandidate = { id: string; displayName: string; currentRole: string | null; maskedEmail: string | null; maskedPhone: string | null; matchingFields: Array<"email" | "phone"> };

export default function ResumeAnalysisPage() {
  const { jdAnalysis, resumeText, setResumeText, candidate, setCandidate, match, setMatch } = useAppStore();
  const [mode, setMode] = useState<"upload" | "paste">("upload");
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState<"parse" | "match" | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedCandidateId, setSavedCandidateId] = useState("");
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  const [parseMeta, setParseMeta] = useState<ProviderMeta | null>(null);
  const [anonymize, setAnonymize] = useState(false);
  const [lastAnonymized, setLastAnonymized] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setError(""); setDuplicates([]); setSaved(false); setSavedCandidateId(""); setLoading("parse"); setFileName(file.name); setResumeFile(file);
    try {
      const form = new FormData(); form.append("file", file); form.append("anonymize", String(anonymize));
      const response = await fetch("/api/resume/parse", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "解析失败");
      setResumeText(data.extractedText); setCandidate(data.result as CandidateProfile); setParseMeta(data.meta as ProviderMeta); setLastAnonymized(Boolean(data.privacy?.anonymized)); setMatch(null);
    } catch (e) { setError(e instanceof Error ? e.message : "解析失败"); setFileName(""); setParseMeta(null); }
    finally { setLoading(null); }
  }

  async function parsePasted() {
    setError("");
    if (resumeText.trim().length < 30) { setError("请粘贴更完整的简历内容。"); return; }
    setLoading("parse");
    try {
      const blob = new File([resumeText], "pasted-resume.txt", { type: "text/plain" });
      await upload(blob);
    } finally { setLoading(null); }
  }

  async function runMatch() {
    if (!jdAnalysis || !candidate) { setError("请先完成职位分析和简历解析。"); return; }
    setError(""); setLoading("match");
    try {
      const response = await fetch("/api/ai/match", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jd: jdAnalysis, candidate }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "匹配失败");
      setMatch(data.result as MatchAnalysis);
    } catch (e) { setError(e instanceof Error ? e.message : "匹配分析失败"); }
    finally { setLoading(null); }
  }

  function onFile(e: ChangeEvent<HTMLInputElement>) { const file = e.target.files?.[0]; if (file) void upload(file); }

  async function saveCandidate(mergeCandidateId?: string) {
    if (!jdAnalysis || !candidate || !match) return;
    setSaving(true); setError("");
    try {
      const body = new FormData();
      body.append("payload", JSON.stringify({ jobTitle: jdAnalysis.jobTitle, jdText: "已确认职位画像", jdAnalysis, candidate, match, anonymized: lastAnonymized }));
      if (resumeFile) body.append("file", resumeFile);
      if (mergeCandidateId) body.append("mergeCandidateId", mergeCandidateId);
      const response = await fetch("/api/candidates", { method: "POST", body });
      const data = await response.json();
      if (response.status === 409 && data.code === "DUPLICATE_CANDIDATE") { setDuplicates(data.duplicates || []); return; }
      if (!response.ok) throw new Error(data.error || "保存失败");
      setDuplicates([]); setSavedCandidateId(data.candidateId); setSaved(true);
    } catch (e) { setError(e instanceof Error ? e.message : "保存失败"); }
    finally { setSaving(false); }
  }

  return (
    <div className="fade-up">
      <div className="no-print"><PageHeader eyebrow="Candidate Intelligence" title="简历解析与人职匹配" description="从简历中提取关键经历，并对照已确认的职位画像给出可追溯的匹配建议。" /></div>
      <div className="no-print mb-6 grid gap-3 sm:grid-cols-3">
        {[{n:"01",t:"选择职位",d:jdAnalysis?.jobTitle || "尚未分析JD",done:!!jdAnalysis},{n:"02",t:"解析简历",d:candidate?.displayName || "等待上传",done:!!candidate},{n:"03",t:"匹配分析",d:match ? `${match.overallScore}% 匹配` : "等待分析",done:!!match}].map((s,i) => <div key={s.n} className={`rounded-xl border px-4 py-3 ${s.done ? "border-brand-100 bg-brand-50" : "border-[#e1e6e3] bg-white"}`}><div className="flex items-center gap-3"><span className={`grid size-7 place-items-center rounded-lg text-[10px] font-bold ${s.done ? "bg-brand-600 text-white" : "bg-[#edf1ee] text-[#7d8982]"}`}>{s.n}</span><div><p className="text-xs font-semibold">{s.t}</p><p className="mt-0.5 text-[11px] text-[#7e8a84]">{s.d}</p></div>{i < 2 && <ArrowRight size={14} className="ml-auto hidden text-[#b5bdb9] sm:block" />}</div></div>)}
      </div>

      <div className="grid gap-6 xl:grid-cols-[.82fr_1.18fr]">
        <section className="no-print space-y-5">
          <div className="panel p-5"><label className="label">匹配职位</label><div className="flex items-center gap-3 rounded-xl border border-[#dce3de] bg-[#fafcfb] p-3"><div className="grid size-9 place-items-center rounded-lg bg-brand-50 text-brand-600"><Briefcase size={17} /></div><div className="flex-1"><p className="text-sm font-semibold">{jdAnalysis?.jobTitle || "请先完成JD分析"}</p><p className="mt-0.5 text-[11px] text-[#7e8a84]">{jdAnalysis?.jobType || "未建立职位画像"}</p></div>{!jdAnalysis && <Link href="/jd-analysis" className="text-xs font-semibold text-brand-600">去分析</Link>}</div></div>
          <div className="panel p-5">
            <div className="mb-4 flex rounded-xl bg-[#f1f4f2] p-1"><button onClick={() => setMode("upload")} className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold ${mode === "upload" ? "bg-white text-ink shadow-sm" : "text-[#75817a]"}`}>上传文件</button><button onClick={() => setMode("paste")} className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold ${mode === "paste" ? "bg-white text-ink shadow-sm" : "text-[#75817a]"}`}>粘贴文本</button></div>
            <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-[#e3e8e4] bg-[#fafcfb] p-3"><div><p className="text-xs font-semibold">候选人姓名</p><p className="mt-1 text-[10px] leading-4 text-[#7e8a84]">默认保留姓名，联系方式仍会强制脱敏</p></div><div className="flex shrink-0 rounded-lg bg-[#edf1ee] p-1"><button type="button" onClick={() => setAnonymize(false)} className={`rounded-md px-2.5 py-1.5 text-[10px] font-semibold ${!anonymize ? "bg-white text-brand-700 shadow-sm" : "text-[#748078]"}`}>保留姓名</button><button type="button" onClick={() => setAnonymize(true)} className={`rounded-md px-2.5 py-1.5 text-[10px] font-semibold ${anonymize ? "bg-white text-brand-700 shadow-sm" : "text-[#748078]"}`}>匿名化</button></div></div>
            {mode === "upload" ? <div>
              <input ref={inputRef} className="hidden" type="file" accept=".pdf,.docx,.txt" onChange={onFile} />
              <button type="button" onClick={() => inputRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const f=e.dataTransfer.files[0]; if(f) void upload(f); }} className="group grid min-h-56 w-full place-items-center rounded-2xl border border-dashed border-[#cbd6d0] bg-[#fafcfb] p-6 text-center transition hover:border-brand-500 hover:bg-brand-50"><div><div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-white text-brand-600 shadow-sm"><UploadCloud size={22} /></div><p className="text-sm font-semibold">点击或拖拽上传简历</p><p className="mt-2 text-xs text-[#7e8a84]">支持 PDF、DOCX、TXT，最大 5MB</p></div></button>
              {fileName && <div className="mt-3 flex items-center gap-3 rounded-xl border border-[#e2e7e4] p-3"><FileText size={17} className="text-brand-600" /><span className="min-w-0 flex-1 truncate text-xs font-medium">{fileName}</span><button aria-label="移除文件" onClick={() => {setFileName("");setResumeFile(null);setCandidate(null);setParseMeta(null);}}><X size={15} className="text-[#8b9690]" /></button></div>}
            </div> : <div><textarea aria-label="简历文本" value={resumeText} onChange={e => setResumeText(e.target.value)} className="input min-h-64 resize-none !leading-6" placeholder="在此粘贴候选人简历文本…" /><button onClick={parsePasted} disabled={loading === "parse"} className="btn-secondary mt-3 w-full">解析文本</button></div>}
            <div className="mt-4 flex gap-2 rounded-xl bg-[#fff9ed] p-3"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-[#a9792f]" /><p className="text-[11px] leading-5 text-[#786848]">仅在已获授权且环境受控时处理真实简历。模型调用前会脱敏敏感字段；点击“保存候选人报告”后，原始文件将存入本地人才库。</p></div>
            {error && <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#fff3f1] px-3 py-2 text-xs text-[#a84d43]"><AlertCircle size={14} />{error}</div>}
          </div>
          {candidate && <div className="panel p-5"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="font-semibold">候选人概览</h2><div className="flex flex-wrap justify-end gap-1.5"><span className="badge">{lastAnonymized ? "已匿名化" : "保留姓名"}</span>{parseMeta && <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${parseMeta.provider === "mock" ? "bg-[#fff0cf] text-[#8a611f]" : "bg-brand-50 text-brand-700"}`}>{parseMeta.provider === "mock" ? "Mock基础解析" : parseMeta.model}</span>}</div></div>{parseMeta?.provider === "mock" && <div className="mb-4 rounded-xl border border-[#ead8b6] bg-[#fff9ed] px-3 py-2 text-[11px] leading-5 text-[#786848]">当前项目目录未启用真实模型，仅按本次简历文本做基础规则提取；不会再套用Demo候选人。配置DeepSeek并重启后可获得完整AI解析。</div>}<div className="grid grid-cols-2 gap-3"><ProfileStat icon={UserRound} label="候选人" value={candidate.displayName} /><ProfileStat icon={Briefcase} label="当前职位" value={candidate.currentRole} /><ProfileStat icon={FileText} label="工作年限" value={candidate.yearsOfExperience ? `${candidate.yearsOfExperience} 年` : "待确认"} /><ProfileStat icon={GraduationCap} label="教育背景" value={candidate.education} /></div><div className="mt-4 flex flex-wrap gap-1.5">{candidate.skills.length ? candidate.skills.map(s => <span key={s} className="badge">{s}</span>) : <span className="text-xs text-[#8b9690]">未从简历中识别到明确技能，建议人工补充。</span>}</div><button disabled={!jdAnalysis || loading !== null} onClick={runMatch} className="btn-primary mt-5 w-full"><Sparkles size={16} />{loading === "match" ? "正在比较职位与经历…" : "开始人职匹配"}</button></div>}
        </section>

        <section className="report-page">{loading ? <div className="panel p-5"><LoadingState label={loading === "parse" ? "正在提取并脱敏简历信息…" : "正在对照职位能力画像生成匹配证据…"} /></div> : match ? <MatchResult match={match} onSave={saveCandidate} saving={saving} saved={saved} savedCandidateId={savedCandidateId} duplicates={duplicates} /> : <EmptyState title="等待匹配分析" description="解析候选人简历后，点击“开始人职匹配”查看报告" />}</section>
      </div>
    </div>
  );
}

function ProfileStat({ icon: Icon, label, value }: { icon: typeof UserRound; label: string; value: string }) { return <div className="rounded-xl bg-[#f7f9f8] p-3"><Icon size={15} className="mb-2 text-[#78857e]" /><p className="text-[10px] text-[#8b9690]">{label}</p><p className="mt-1 truncate text-xs font-semibold">{value}</p></div>; }

function MatchResult({ match, onSave, saving, saved, savedCandidateId, duplicates }: { match: MatchAnalysis; onSave: (mergeCandidateId?: string) => void; saving: boolean; saved: boolean; savedCandidateId: string; duplicates: DuplicateCandidate[] }) {
  const assessment = getMatchAssessment(match.overallScore);
  return <div className="space-y-5">
    <div className="panel overflow-hidden"><div className={`grid gap-5 bg-gradient-to-r ${assessment.headerClassName} p-5 md:grid-cols-[160px_1fr]`}><div className="flex justify-center"><ScoreRing score={match.overallScore} label="综合匹配" /></div><div className="flex flex-col justify-center"><span className={`mb-2 w-fit rounded-full px-2.5 py-1 text-[10px] font-bold ${assessment.badgeClassName}`}>{assessment.action}</span><h2 className="text-lg font-bold">{assessment.title}</h2><p className="mt-2 text-sm leading-6 text-[#5f6d65]">{match.summary}</p></div></div><div className="grid grid-cols-2 gap-px bg-[#e9eeeb] sm:grid-cols-4">{[{l:"能力匹配",v:match.competencyScore},{l:"经验匹配",v:match.experienceScore},{l:"行业匹配",v:match.industryScore},{l:"必须条件",v:match.mustHaveScore}].map(x=><div key={x.l} className="bg-white p-4 text-center"><p className="text-xl font-bold">{x.v}<span className="text-xs">%</span></p><p className="mt-1 text-[11px] text-[#7c8881]">{x.l}</p></div>)}</div></div>
    <div className="grid gap-5 lg:grid-cols-2"><div className="panel p-5"><h3 className="mb-4 text-sm font-semibold">匹配优势</h3><SignalList items={match.strengths} /></div><div className="panel p-5"><h3 className="mb-4 text-sm font-semibold">风险与待验证项</h3><SignalList items={match.risks} tone="risk" /></div></div>
    <div className="panel p-5"><div className="mb-4 flex items-center justify-between"><h3 className="text-sm font-semibold">结论证据</h3><span className="badge">来自简历原文</span></div><div className="space-y-3">{match.evidence.map(e => <div key={e.conclusion} className="rounded-xl border border-[#e7ebe8] p-4"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold">{e.conclusion}</p><span className="text-[10px] font-semibold text-brand-600">{e.confidence}置信度</span></div><blockquote className="mt-2 border-l-2 border-brand-200 pl-3 text-xs leading-5 text-[#6d7972]">“{e.quote}”</blockquote></div>)}</div></div>
    <div className="panel p-5"><h3 className="mb-4 text-sm font-semibold">建议重点询问</h3><ol className="space-y-3">{match.interviewSuggestions.map((q,i)=><li key={q} className="flex gap-3 text-sm leading-6 text-[#445149]"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-50 text-[10px] font-bold text-brand-700">{i+1}</span>{q}</li>)}</ol><Link href="/interview" className="btn-primary mt-5 w-full">生成完整面试指南 <ArrowRight size={15} /></Link></div>
    {duplicates.length>0&&<div className="no-print rounded-xl border border-[#ecd9b9] bg-[#fff9ed] p-4"><div className="flex gap-2"><GitMerge size={17} className="mt-0.5 shrink-0 text-[#a9792f]"/><div><p className="text-xs font-semibold text-[#725a31]">该简历已存在于人才库</p><p className="mt-1 text-[11px] leading-5 text-[#806f50]">手机号或邮箱命中已有档案。合并后会把本次匹配报告、招聘职位和原始简历写入同一人才档案。</p></div></div><div className="mt-3 space-y-2">{duplicates.map(item=><div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#eadfc9] bg-white p-3"><div><p className="text-xs font-semibold">{item.displayName} · {item.currentRole||"当前职位待补充"}</p><p className="mt-1 text-[10px] text-[#7a6d55]">{item.maskedPhone||"无电话"} · {item.maskedEmail||"无邮箱"} · 命中{item.matchingFields.map(field=>field==="phone"?"手机号":"邮箱").join("、")}</p></div><div className="flex gap-2"><Link href={`/candidates/${item.id}`} target="_blank" className="btn-secondary !px-3 !py-2">查看</Link><button disabled={saving} onClick={()=>onSave(item.id)} className="btn-primary !px-3 !py-2"><GitMerge size={13}/>合并报告</button></div></div>)}</div></div>}
    <div className="no-print grid gap-3 sm:grid-cols-2">{saved&&savedCandidateId?<Link href={`/candidates/${savedCandidateId}`} className="btn-primary"><Save size={15}/>已保存，查看候选人</Link>:<button onClick={()=>onSave()} disabled={saving||saved} className="btn-primary"><Save size={15}/>{saving?"保存中…":"保存候选人报告"}</button>}<button onClick={()=>window.print()} className="btn-secondary"><Printer size={15}/>打印 / 导出PDF</button></div>
    <div className="no-print"><AiNotice /></div>
  </div>;
}
