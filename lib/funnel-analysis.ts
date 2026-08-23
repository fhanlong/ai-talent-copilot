import type { FunnelAnalysis, FunnelData, FunnelRates } from "@/lib/types";

export const FUNNEL_STAGES: Array<{ key: keyof FunnelData; label: string; short: string }> = [
  { key: "received", label: "收到简历", short: "简历" },
  { key: "screened", label: "初筛通过", short: "初筛" },
  { key: "interviewed", label: "参加面试", short: "面试" },
  { key: "offersMade", label: "发放 Offer", short: "Offer" },
  { key: "offersAccepted", label: "接受 Offer", short: "接受" },
  { key: "onboarded", label: "正式入职", short: "入职" },
];

const EDGE_GUIDANCE: Record<string, { causes: string[]; recommendations: string[] }> = {
  "收到简历→初筛": {
    causes: ["渠道带来的简历与职位画像偏差较大", "JD中的必须条件或职责范围不够清晰", "初筛口径在不同HR之间尚未校准"],
    recommendations: ["按渠道抽样复盘未通过简历并标记主要原因", "将必须条件与加分条件分开表达", "使用统一初筛清单做一次交叉校准"],
  },
  "初筛→面试": {
    causes: ["候选人意愿在初筛后发生变化", "首次联系或面试排期等待时间较长", "职位地点、出差或工作方式与预期不符"],
    recommendations: ["复盘最近10位未进入面试候选人的退出原因", "跟踪初筛后首次联系时效并控制在24小时内", "在邀约前统一说明职位关键约束"],
  },
  "面试→Offer": {
    causes: ["面试评价标准与职位画像未充分对齐", "候选人关键能力证据不足", "业务部门对人才标准存在分歧"],
    recommendations: ["复盘近期开过面但未发Offer的评价记录", "统一核心能力的行为证据和评分锚点", "在面试前完成HR与业务用人标准校准"],
  },
  "Offer→接受": {
    causes: ["薪酬方案或职位发展空间竞争力不足", "Offer流程耗时导致候选人接受其他机会", "候选人对职责、汇报关系或工作地点仍有疑虑"],
    recommendations: ["记录并分类候选人拒绝Offer的真实原因", "缩短审批与发放周期并设置跟进节点", "在发放前完成薪酬预期和职位信息确认"],
  },
  "接受→入职": {
    causes: ["候选人收到原公司挽留或其他Offer", "离职周期内沟通与关系维护不足", "背调、入职材料或到岗安排存在阻塞"],
    recommendations: ["建立Offer接受到入职的固定沟通节奏", "提前识别反Offer和离职风险", "为背调与入职材料设置负责人和时限"],
  },
};

const FUNNEL_EDGES: Array<{ from: keyof FunnelData; to: keyof FunnelData; name: string }> = [
  { from: "received", to: "screened", name: "收到简历→初筛" },
  { from: "screened", to: "interviewed", name: "初筛→面试" },
  { from: "interviewed", to: "offersMade", name: "面试→Offer" },
  { from: "offersMade", to: "offersAccepted", name: "Offer→接受" },
  { from: "offersAccepted", to: "onboarded", name: "接受→入职" },
];

export function percentage(value: number, base: number) {
  return base > 0 ? Math.round((value / base) * 100) : 0;
}

export function getFunnelRates(data: FunnelData): FunnelRates {
  return {
    screen: percentage(data.screened, data.received),
    interview: percentage(data.interviewed, data.screened),
    offer: percentage(data.offersMade, data.interviewed),
    accept: percentage(data.offersAccepted, data.offersMade),
    onboard: percentage(data.onboarded, data.offersAccepted),
    overall: percentage(data.onboarded, data.received),
  };
}

export function validateFunnel(data: FunnelData): string | null {
  for (let index = 1; index < FUNNEL_STAGES.length; index += 1) {
    const current = FUNNEL_STAGES[index];
    const previous = FUNNEL_STAGES[index - 1];
    if (data[current.key] > data[previous.key]) {
      return `${current.label}人数不能高于${previous.label}人数`;
    }
  }
  return null;
}

export function buildFunnelAnalysis(data: FunnelData): FunnelAnalysis {
  const edges = FUNNEL_EDGES.map((edge) => {
    const from = data[edge.from];
    const to = data[edge.to];
    return {
      name: edge.name,
      conversionRate: percentage(to, from),
      lostCount: Math.max(0, from - to),
      hasBase: from > 0,
    };
  });

  const comparable = edges.filter((edge) => edge.hasBase);
  const bottleneck = comparable.reduce((lowest, edge) => {
    if (edge.conversionRate < lowest.conversionRate) return edge;
    if (edge.conversionRate === lowest.conversionRate && edge.lostCount > lowest.lostCount) return edge;
    return lowest;
  }, comparable[0] ?? edges[0]);

  const guidance = EDGE_GUIDANCE[bottleneck.name] ?? EDGE_GUIDANCE["收到简历→初筛"];
  const severity = bottleneck.conversionRate < 30 ? "高风险" : bottleneck.conversionRate < 60 ? "需关注" : "相对健康";
  return {
    bottleneck: bottleneck.name,
    conversionRate: bottleneck.conversionRate,
    lostCount: bottleneck.lostCount,
    severity,
    possibleCauses: guidance.causes,
    recommendations: guidance.recommendations,
    summary: `当前最低转化环节为${bottleneck.name}，转化率${bottleneck.conversionRate}%，该环节人数减少${bottleneck.lostCount}人。原因需结合候选人退出记录进一步验证。`,
  };
}
