export type MatchAssessment = {
  title: string;
  action: string;
  headerClassName: string;
  badgeClassName: string;
};

export const MATCH_INTERVIEW_THRESHOLD = 80;

/**
 * 将模型分数映射为一致的HR辅助文案。
 * 仅80分及以上提示进入面试，且最终流程决定仍由HR完成。
 */
export function getMatchAssessment(score: number): MatchAssessment {
  const normalizedScore = Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0;

  if (normalizedScore >= MATCH_INTERVIEW_THRESHOLD) {
    return {
      title: "职位匹配度高",
      action: "建议进入面试",
      headerClassName: "from-[#f2faf6] to-white",
      badgeClassName: "bg-brand-100 text-brand-700",
    };
  }

  if (normalizedScore >= 60) {
    return {
      title: "职位匹配度较高",
      action: "建议进一步评估",
      headerClassName: "from-[#f4f8ff] to-white",
      badgeClassName: "bg-[#e8f0ff] text-[#315f9c]",
    };
  }

  if (normalizedScore >= 40) {
    return {
      title: "职位匹配度一般",
      action: "建议补充核实",
      headerClassName: "from-[#fff9ed] to-white",
      badgeClassName: "bg-[#fff0cf] text-[#8a611f]",
    };
  }

  return {
    title: "职位匹配度较低",
    action: "建议谨慎评估",
    headerClassName: "from-[#fff4f2] to-white",
    badgeClassName: "bg-[#fde7e3] text-[#a4483f]",
  };
}
