import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { AppStoreProvider } from "@/components/app-store";

export const metadata: Metadata = {
  title: "AI Talent Copilot — 智能招聘辅助助手",
  description: "基于真实HR场景设计的AI招聘辅助决策工具",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <AppStoreProvider>
          <AppShell>{children}</AppShell>
        </AppStoreProvider>
      </body>
    </html>
  );
}
