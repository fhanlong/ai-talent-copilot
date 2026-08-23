"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BriefcaseBusiness, ChevronDown, FileSearch, FolderKanban, LayoutDashboard, LogOut, Menu, MessageSquareText, Settings, ShieldCheck, Sparkles, Users, X } from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/", label: "招聘概览", icon: LayoutDashboard },
  { href: "/jobs", label: "职位管理", icon: FolderKanban },
  { href: "/candidates", label: "候选人管理", icon: Users },
  { href: "/jd-analysis", label: "JD 智能分析", icon: BriefcaseBusiness },
  { href: "/resume-analysis", label: "简历匹配", icon: FileSearch },
  { href: "/interview", label: "面试与排期", icon: MessageSquareText },
  { href: "/dashboard", label: "招聘漏斗", icon: BarChart3 },
  { href: "/settings", label: "模型与设置", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/login"; }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[244px_1fr]">
      {open && <button aria-label="关闭导航遮罩" className="fixed inset-0 z-30 bg-black/20 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[244px] flex-col border-r border-[#e1e7e3] bg-[#fbfcfb] transition-transform lg:sticky lg:top-0 lg:h-screen ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="flex h-[72px] items-center gap-3 border-b border-[#edf0ee] px-5">
          <div className="grid size-9 place-items-center rounded-xl bg-brand-600 text-white shadow-sm"><Sparkles size={18} /></div>
          <div>
            <p className="text-[15px] font-bold tracking-tight">AI Talent Copilot</p>
            <p className="text-[11px] text-[#84908a]">智能招聘辅助助手</p>
          </div>
          <button className="ml-auto lg:hidden" onClick={() => setOpen(false)} aria-label="关闭菜单"><X size={19} /></button>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-5">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-[#9aa49f]">Workspace</p>
          {navItems.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? "bg-[#eaf5ef] text-brand-700" : "text-[#53615a] hover:bg-[#f1f4f2] hover:text-[#26332d]"}`}>
                <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />{item.label}
              </Link>
            );
          })}
        </nav>
        <div className="m-3 rounded-2xl border border-[#dbe8e1] bg-[#f3faf6] p-3.5">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-brand-700"><ShieldCheck size={15} /> 数据安全模式</div>
          <p className="text-[11px] leading-5 text-[#64736b]">联系方式默认遮罩，查看与简历下载均记录审计日志。</p>
        </div>
        <div className="flex items-center gap-3 border-t border-[#edf0ee] px-4 py-4">
          <div className="grid size-9 place-items-center rounded-full bg-[#263b33] text-xs font-bold text-white">HR</div>
          <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">招聘工作台</p><p className="text-[11px] text-[#8a958f]">本地工作区</p></div>
          <button title="退出登录" onClick={logout} className="rounded-lg p-1.5 text-[#8a958f] hover:bg-[#eef2ef] hover:text-[#46534c]"><LogOut size={15} /></button>
        </div>
      </aside>

      <main className="min-w-0">
        <header className="sticky top-0 z-20 flex h-[64px] items-center border-b border-[#e3e8e4] bg-white/90 px-4 backdrop-blur md:px-7 lg:hidden">
          <button onClick={() => setOpen(true)} aria-label="打开菜单" className="mr-3 rounded-lg p-2 hover:bg-gray-100"><Menu size={20} /></button>
          <span className="font-semibold">AI Talent Copilot</span>
        </header>
        <div className="mx-auto w-full max-w-[1440px] px-4 py-6 md:px-7 md:py-8 lg:px-9">{children}</div>
      </main>
    </div>
  );
}
