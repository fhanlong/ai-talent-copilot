"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, CalendarDays, CheckCircle2, ChevronDown, ChevronUp, ClipboardCheck, Clock3, Download, Mail, MessageSquareText, Sparkles, Target, UserRound, XCircle } from "lucide-react";
import { useAppStore } from "@/components/app-store";
import { AiNotice, EmptyState, LoadingState, PageHeader } from "@/components/ui";
import type { InterviewGuide, InterviewQuestion } from "@/lib/types";

type UpcomingSchedule={id:string;title:string;startsAt:string;candidate:{id:string;displayName:string};job:{id:string;title:string}|null};

export default function InterviewPage() {
  const { jdAnalysis, candidate, match } = useAppStore();
  const [guide, setGuide] = useState<InterviewGuide | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [duration, setDuration] = useState("45");
  const [upcoming, setUpcoming] = useState<UpcomingSchedule[]>([]);

  useEffect(()=>{void fetch("/api/interviews/schedules?upcoming=true").then(response=>response.json()).then(data=>setUpcoming(data.schedules||[])).catch(()=>setUpcoming([]))},[]);

  async function openMail(scheduleId:string){const response=await fetch(`/api/interviews/schedules/${scheduleId}/invite`,{method:"POST"});const data=await response.json();if(response.ok)window.location.href=data.mailto;else setError(data.error||"邮件邀请生成失败")}

  async function generate() {
    if (!jdAnalysis || !candidate || !match) { setError("请先完成JD分析与候选人匹配。"); return; }
    setError(""); setLoading(true);
    try {
      const response = await fetch("/api/ai/interview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobTitle: jdAnalysis.jobTitle, candidate, match }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "生成失败");
      setGuide({ ...data.result, duration: Number(duration) });
    } catch(e) { setError(e instanceof Error ? e.message : "生成失败"); }
    finally { setLoading(false); }
  }

  return <div className="fade-up">
    <PageHeader eyebrow="Interview Copilot" title="面试助手与排期" description="集中查看近期面试，并基于职位要求和候选人风险点生成结构化面试指南。" action={guide && <button className="no-print btn-secondary" onClick={() => window.print()}><Download size={15} /> 打印 / 导出PDF</button>} />
    <section className="no-print panel mb-6 p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">近期面试</h2><p className="mt-1 text-xs text-[#7b8781]">来自候选人档案中的实际排期</p></div><span className="badge">{upcoming.length} 场待进行</span></div>{upcoming.length?<div className="mt-4 grid gap-3 lg:grid-cols-2">{upcoming.slice(0,6).map(schedule=><div key={schedule.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-[#e3e9e5] p-3"><div className="grid size-9 place-items-center rounded-lg bg-brand-50 text-brand-700"><CalendarDays size={16}/></div><div className="min-w-0 flex-1"><Link href={`/candidates/${schedule.candidate.id}`} className="truncate text-xs font-semibold hover:text-brand-700">{schedule.candidate.displayName} · {schedule.job?.title||schedule.title}</Link><p className="mt-1 text-[10px] text-[#7d8982]">{new Date(schedule.startsAt).toLocaleString("zh-CN",{dateStyle:"medium",timeStyle:"short"})}</p></div><button onClick={()=>void openMail(schedule.id)} className="btn-secondary !px-2.5 !py-2" title="打开邮箱邀请"><Mail size={13}/></button><a href={`/api/interviews/schedules/${schedule.id}/calendar`} className="btn-secondary !px-2.5 !py-2" title="下载日历"><Download size={13}/></a></div>)}</div>:<p className="mt-4 rounded-xl bg-[#f7f9f8] p-4 text-xs text-[#748078]">暂无待进行面试。请进入候选人详情安排面试时间。</p>}</section>
    <div className="grid gap-6 xl:grid-cols-[330px_1fr]">
      <aside className="no-print space-y-5">
        <div className="panel p-5"><h2 className="font-semibold">面试设置</h2><div className="mt-5 space-y-4"><div><label className="label">目标职位</label><div className="input !bg-[#fafcfb]">{jdAnalysis?.jobTitle || "尚未选择"}</div></div><div><label className="label">候选人</label><div className="flex items-center gap-2.5 rounded-xl border border-[#dce3de] bg-[#fafcfb] p-3"><div className="grid size-8 place-items-center rounded-full bg-[#eaf5ef] text-brand-700"><UserRound size={15} /></div><div><p className="text-xs font-semibold">{candidate?.displayName || "尚未解析"}</p><p className="mt-0.5 text-[10px] text-[#84908a]">{candidate?.currentRole || "请先完成简历分析"}</p></div></div></div><div><label className="label">面试类型</label><select className="input"><option>结构化业务面试</option><option>HR 初面</option><option>复试 / 业务负责人面</option></select></div><div><label className="label">建议时长</label><div className="grid grid-cols-3 gap-2">{["30","45","60"].map(x=><button key={x} onClick={()=>setDuration(x)} className={`rounded-lg border py-2 text-xs font-semibold ${duration===x?"border-brand-500 bg-brand-50 text-brand-700":"border-[#dfe5e1] text-[#6e7a74]"}`}>{x} 分钟</button>)}</div></div></div>{error && <div className="mt-4 flex gap-2 rounded-lg bg-[#fff3f1] p-3 text-xs text-[#a84d43]"><AlertCircle size={14} className="shrink-0" />{error}</div>}<button onClick={generate} disabled={loading} className="btn-primary mt-5 w-full"><Sparkles size={16} />生成面试指南</button></div>
        <div className="panel p-5"><h3 className="text-sm font-semibold">准备状态</h3><div className="mt-4 space-y-3">{[{l:"职位能力画像",ok:!!jdAnalysis,href:"/jd-analysis"},{l:"候选人解析",ok:!!candidate,href:"/resume-analysis"},{l:"人职匹配报告",ok:!!match,href:"/resume-analysis"}].map(x=><div key={x.l} className="flex items-center gap-2 text-xs"><CheckCircle2 size={15} className={x.ok?"text-brand-600":"text-[#c6ceca]"}/><span className="flex-1 text-[#59665f]">{x.l}</span>{!x.ok&&<Link href={x.href} className="text-brand-600">去完成</Link>}</div>)}</div></div>
        <AiNotice compact />
      </aside>
      <section className="report-page">{loading?<div className="panel p-5"><LoadingState label="正在结合职位能力和候选人证据设计追问路径…" /></div>:guide?<GuideResult guide={guide} />:<EmptyState title="准备结构化面试" description="完成左侧设置后，AI将生成定制化STAR问题与评价表" />}</section>
    </div>
  </div>;
}

function GuideResult({ guide }: { guide: InterviewGuide }) {
  return <div className="space-y-5">
    <div className="panel overflow-hidden"><div className="border-b border-[#e7ece9] bg-gradient-to-r from-[#eef8f3] to-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><span className="eyebrow">Interview Brief</span><h2 className="mt-2 text-xl font-bold">结构化面试指南</h2></div><div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold shadow-sm"><Clock3 size={15} className="text-brand-600" />{guide.duration} 分钟</div></div></div><div className="p-5"><p className="text-xs font-semibold text-[#7b8781]">建议开场</p><p className="mt-2 text-sm leading-6 text-[#4e5c54]">{guide.opening}</p><div className="mt-5 grid grid-cols-4 gap-2">{[{l:"开场",v:"5m"},{l:"经历核实",v:"10m"},{l:"能力验证",v:`${Math.max(10,guide.duration-20)}m`},{l:"候选人提问",v:"5m"}].map(x=><div key={x.l} className="rounded-lg bg-[#f5f8f6] p-2.5 text-center"><p className="text-xs font-bold">{x.v}</p><p className="mt-1 text-[10px] text-[#84908a]">{x.l}</p></div>)}</div></div></div>
    <div><div className="mb-3 flex items-center gap-2"><MessageSquareText size={17} className="text-brand-600"/><h2 className="font-semibold">STAR 行为面试问题</h2><span className="badge">{guide.questions.length} 题</span></div><div className="space-y-3">{guide.questions.map((q,i)=><QuestionCard key={q.question} question={q} index={i+1}/>)}</div></div>
    <div className="panel p-5"><div className="mb-4 flex items-center gap-2"><ClipboardCheck size={17} className="text-brand-600"/><h2 className="font-semibold">面试评价模板</h2></div><div className="overflow-hidden rounded-xl border border-[#e5eae7]"><div className="grid grid-cols-[1fr_80px] bg-[#f6f8f7] px-4 py-2.5 text-[11px] font-semibold text-[#6d7972]"><span>评价维度与行为证据</span><span className="text-center">权重</span></div>{guide.evaluationDimensions.map(d=><div key={d.name} className="grid grid-cols-[1fr_80px] border-t border-[#e9eeeb] px-4 py-4"><div><p className="text-sm font-semibold">{d.name}</p><p className="mt-1 text-xs leading-5 text-[#78847e]">{d.guidance}</p><div className="mt-3 h-8 rounded-lg border border-dashed border-[#d9e0dc] bg-[#fbfcfb]" /></div><div className="flex items-start justify-center text-sm font-bold text-brand-700">{d.weight}%</div></div>)}</div><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-[#f6f8f7] p-4"><p className="text-xs font-semibold">综合评价</p><div className="mt-3 h-20 rounded-lg border border-dashed border-[#d7dfda] bg-white" /></div><div className="rounded-xl bg-[#f6f8f7] p-4"><p className="text-xs font-semibold">录用建议</p><div className="mt-4 flex flex-wrap gap-2">{["强烈推荐","推荐","保留","不推荐"].map(x=><span key={x} className="rounded-lg border border-[#dfe5e1] bg-white px-2.5 py-1.5 text-[11px] text-[#65726b]">□ {x}</span>)}</div></div></div></div>
    <AiNotice />
  </div>;
}

function QuestionCard({ question, index }: { question: InterviewQuestion; index: number }) {
  const [open,setOpen]=useState(index===1);
  return <div className="panel overflow-hidden"><button onClick={()=>setOpen(!open)} className="flex w-full items-start gap-4 p-5 text-left"><span className="grid size-8 shrink-0 place-items-center rounded-xl bg-brand-50 text-xs font-bold text-brand-700">{String(index).padStart(2,"0")}</span><div className="min-w-0 flex-1"><div className="mb-2 flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#f1f4f2] px-2 py-1 text-[10px] font-semibold text-[#617068]">{question.competency}</span><span className="text-[10px] text-[#8b9690]">STAR行为问题</span></div><p className="text-sm font-semibold leading-6">{question.question}</p></div>{open?<ChevronUp size={17} className="mt-1 text-[#84908a]"/>:<ChevronDown size={17} className="mt-1 text-[#84908a]"/>}</button>{open&&<div className="border-t border-[#e9eeeb] bg-[#fbfcfb] px-5 py-4"><div className="grid gap-5 lg:grid-cols-2"><div><div className="mb-3 flex items-center gap-2 text-xs font-semibold"><Target size={14} className="text-brand-600"/>为什么问</div><p className="text-xs leading-5 text-[#6a766f]">{question.why}</p><p className="mb-2 mt-4 text-xs font-semibold">建议追问</p><ol className="space-y-2">{question.followUps.map((x,i)=><li key={x} className="flex gap-2 text-xs leading-5 text-[#66736c]"><span className="font-bold text-brand-600">{i+1}.</span>{x}</li>)}</ol></div><div className="space-y-3"><div className="rounded-xl border border-[#dfece5] bg-[#f3faf6] p-3"><p className="mb-2 flex items-center gap-2 text-xs font-semibold text-brand-700"><CheckCircle2 size={14}/>正向信号</p>{question.positiveSignals.map(x=><p key={x} className="mt-1.5 text-[11px] leading-5 text-[#5f6e66]">· {x}</p>)}</div><div className="rounded-xl border border-[#f0dfdc] bg-[#fff7f5] p-3"><p className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#9e5149]"><XCircle size={14}/>风险信号</p>{question.riskSignals.map(x=><p key={x} className="mt-1.5 text-[11px] leading-5 text-[#78635f]">· {x}</p>)}</div></div></div></div>}</div>;
}
