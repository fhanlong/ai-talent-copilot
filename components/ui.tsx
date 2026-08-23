import { AlertTriangle, CheckCircle2, Info, LoaderCircle, Sparkles } from "lucide-react";

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>{eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}<h1 className="text-2xl font-bold tracking-[-.03em] md:text-[30px]">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#66736d]">{description}</p></div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function AiNotice({ compact = false }: { compact?: boolean }) {
  return <div className={`flex gap-3 rounded-xl border border-[#dce9e2] bg-[#f3faf6] ${compact ? "px-3 py-2.5" : "p-4"}`}><Info className="mt-0.5 shrink-0 text-brand-600" size={16} /><p className="text-xs leading-5 text-[#57665e]">AI 分析仅作为招聘辅助参考，请结合面试证据与业务需求完成最终判断。</p></div>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="panel grid min-h-64 place-items-center p-8 text-center"><div><div className="mx-auto mb-3 grid size-11 place-items-center rounded-2xl bg-brand-50 text-brand-600"><Sparkles size={20} /></div><p className="font-semibold">{title}</p><p className="mt-1 text-sm text-[#78847e]">{description}</p></div></div>;
}

export function LoadingState({ label = "AI 正在分析…" }: { label?: string }) {
  return <div className="flex items-center justify-center gap-3 rounded-xl border border-brand-100 bg-brand-50 px-4 py-8 text-sm font-medium text-brand-700"><LoaderCircle size={18} className="animate-spin" />{label}</div>;
}

export function ScoreRing({ score, label, size = "large" }: { score: number; label: string; size?: "large" | "small" }) {
  const dim = size === "large" ? 132 : 92;
  const radius = size === "large" ? 53 : 36;
  const stroke = size === "large" ? 9 : 7;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative grid place-items-center" style={{ width: dim, height: dim }}>
      <svg className="-rotate-90" width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`}>
        <circle cx={dim / 2} cy={dim / 2} r={radius} fill="none" stroke="#edf1ee" strokeWidth={stroke} />
        <circle cx={dim / 2} cy={dim / 2} r={radius} fill="none" stroke={score >= 80 ? "#238b63" : score >= 60 ? "#c58a29" : "#c25b51"} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - score / 100)} />
      </svg>
      <div className="absolute text-center"><p className={`${size === "large" ? "text-3xl" : "text-xl"} font-bold tracking-tight`}>{score}<span className="text-sm">%</span></p><p className="mt-0.5 text-[11px] text-[#7b8781]">{label}</p></div>
    </div>
  );
}

export function SignalList({ items, tone = "positive" }: { items: string[]; tone?: "positive" | "risk" | "neutral" }) {
  const Icon = tone === "positive" ? CheckCircle2 : tone === "risk" ? AlertTriangle : Info;
  const color = tone === "positive" ? "text-brand-600" : tone === "risk" ? "text-[#b25a4f]" : "text-[#78857f]";
  return <ul className="space-y-3">{items.map((item) => <li key={item} className="flex gap-2.5 text-sm leading-6 text-[#445149]"><Icon className={`mt-1 shrink-0 ${color}`} size={16} />{item}</li>)}</ul>;
}
