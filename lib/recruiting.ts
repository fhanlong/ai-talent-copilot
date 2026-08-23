import type { FunnelData } from "./types";

export const APPLICATION_STAGES = [
  { value: "RECEIVED", label: "收到简历", short: "简历" },
  { value: "SCREENED", label: "通过初筛", short: "初筛" },
  { value: "INTERVIEW", label: "面试", short: "面试" },
  { value: "OFFER", label: "已发 Offer", short: "Offer" },
  { value: "OFFER_ACCEPTED", label: "接受 Offer", short: "接受" },
  { value: "ONBOARDED", label: "已入职", short: "入职" },
] as const;

export type ApplicationStage = typeof APPLICATION_STAGES[number]["value"];

export const APPLICATION_STAGE_VALUES = APPLICATION_STAGES.map((stage) => stage.value) as [ApplicationStage, ...ApplicationStage[]];

export function stageIndex(stage: string) {
  const index = APPLICATION_STAGES.findIndex((item) => item.value === stage);
  return index < 0 ? 0 : index;
}

export function stageLabel(stage: string) {
  return APPLICATION_STAGES.find((item) => item.value === stage)?.label ?? "收到简历";
}

export function buildActualFunnel(applications: Array<{ stage: string }>): FunnelData {
  const reached = (minimum: number) => applications.filter((application) => stageIndex(application.stage) >= minimum).length;
  return {
    received: applications.length,
    screened: reached(1),
    interviewed: reached(2),
    offersMade: reached(3),
    offersAccepted: reached(4),
    onboarded: reached(5),
  };
}

export function pipelineProgress(applications: Array<{ stage: string }>) {
  if (!applications.length) return 0;
  return Math.round(applications.reduce((sum, application) => sum + stageIndex(application.stage), 0) / (applications.length * (APPLICATION_STAGES.length - 1)) * 100);
}
