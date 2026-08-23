"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { CandidateProfile, FunnelData, JDAnalysis, MatchAnalysis } from "@/lib/types";

type AppState = {
  jdText: string;
  jdAnalysis: JDAnalysis | null;
  resumeText: string;
  candidate: CandidateProfile | null;
  match: MatchAnalysis | null;
  funnel: FunnelData;
};

type Store = AppState & {
  setJdText: (value: string) => void;
  setJdAnalysis: (value: JDAnalysis | null) => void;
  setResumeText: (value: string) => void;
  setCandidate: (value: CandidateProfile | null) => void;
  setMatch: (value: MatchAnalysis | null) => void;
  setFunnel: (value: FunnelData) => void;
  resetWorkspace: () => void;
};

const initialState: AppState = {
  jdText: "",
  jdAnalysis: null,
  resumeText: "",
  candidate: null,
  match: null,
  funnel: { received: 0, screened: 0, interviewed: 0, offersMade: 0, offersAccepted: 0, onboarded: 0 },
};

const AppStore = createContext<Store | null>(null);

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("talent-copilot-workspace-v1");
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<AppState>;
        setState({
          ...initialState,
          jdText: typeof parsed.jdText === "string" ? parsed.jdText : initialState.jdText,
          jdAnalysis: parsed.jdAnalysis ?? initialState.jdAnalysis,
          funnel: parsed.funnel ?? initialState.funnel,
        });
      }
    } catch { /* 使用空白工作区 */ }
  }, []);

  useEffect(() => {
    // 只持久化当前编辑中的职位JD；候选人与招聘流程以数据库为唯一数据源。
    try { localStorage.setItem("talent-copilot-workspace-v1", JSON.stringify({ jdText: state.jdText, jdAnalysis: state.jdAnalysis })); } catch { /* no-op */ }
  }, [state]);

  const value = useMemo<Store>(() => ({
    ...state,
    setJdText: (jdText) => setState((s) => ({ ...s, jdText })),
    setJdAnalysis: (jdAnalysis) => setState((s) => ({ ...s, jdAnalysis })),
    setResumeText: (resumeText) => setState((s) => ({ ...s, resumeText })),
    setCandidate: (candidate) => setState((s) => ({ ...s, candidate })),
    setMatch: (match) => setState((s) => ({ ...s, match })),
    setFunnel: (funnel) => setState((s) => ({ ...s, funnel })),
    resetWorkspace: () => setState(initialState),
  }), [state]);

  return <AppStore.Provider value={value}>{children}</AppStore.Provider>;
}

export function useAppStore() {
  const store = useContext(AppStore);
  if (!store) throw new Error("useAppStore must be used inside AppStoreProvider");
  return store;
}
