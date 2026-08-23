import type { CandidateProfile, FunnelData, JDAnalysis, MatchAnalysis } from "./types";

export const DEMO_JD = `职位：区域销售经理

职责：
1. 负责华中区域工业客户开发与销售计划落地；
2. 维护重点客户关系，识别客户需求并协调解决方案；
3. 管理区域销售管道，完成年度销售目标；
4. 收集市场与竞品信息，支持销售策略制定。

要求：
1. 本科及以上学历，3年以上B2B销售经验；
2. 熟悉工业品或制造业客户销售流程；
3. 具备陌生客户开发、商务谈判和大客户维护能力；
4. 能够适应区域出差，具备数据化销售管理意识。`;

export const DEMO_RESUME = `候选人：林晨（Demo虚构人物）
现任职位：大客户销售主管
工作年限：5年
教育背景：华中科技大学 市场营销 本科

工作经历：
2021年至今，某自动化设备公司，大客户销售主管
- 负责湖北、湖南制造业客户开发，年度销售额从680万元增长至1120万元；
- 通过行业展会、客户转介绍和电话开发新增工业客户23家；
- 管理35家重点客户，CRM商机更新及时率保持95%以上；
- 独立参与技术方案沟通、商务谈判和合同回款管理；
- 连续两年完成年度销售目标，2024年完成率为118%。

2019年至2021年，某企业服务公司，销售顾问
- 面向中小企业销售SaaS产品，负责线索跟进与客户续约；
- 个人季度最高签约额位列团队第二。

技能：B2B销售、客户开发、商务谈判、CRM管理、大客户维护、销售数据分析。`;

export const DEMO_JD_ANALYSIS: JDAnalysis = {
  jobTitle: "区域销售经理",
  jobType: "业务拓展型 · 工业客户",
  summary: "该职位的核心任务是开拓华中区域工业客户，并通过持续的商机管理和客户经营完成区域销售目标。",
  competencies: [
    { name: "客户开发能力", description: "能独立识别线索、触达并转化陌生工业客户", importance: 5 },
    { name: "商务谈判能力", description: "能够平衡价格、交付、回款等条件并推动签约", importance: 4 },
    { name: "行业理解能力", description: "理解工业客户采购流程与多角色决策链", importance: 4 },
    { name: "客户经营能力", description: "持续维护关键客户并挖掘增购机会", importance: 4 },
    { name: "目标与数据管理", description: "基于销售漏斗管理预测和目标达成", importance: 3 }
  ],
  mustHave: ["3年以上B2B销售经验", "陌生客户开发", "工业或制造业客户经验", "商务谈判"],
  preferred: ["CRM管理", "大客户管理", "区域市场经验", "销售数据分析"],
  interviewFocus: ["验证新增客户是否由候选人主导开发", "核实销售目标口径及个人贡献", "了解复杂工业客户决策链的推进方式", "判断出差意愿与区域覆盖能力"],
  ambiguities: ["未说明客单价与平均销售周期", "未说明团队管理职责范围", "薪酬结构与出差频率需要进一步确认"]
};

export const DEMO_CANDIDATE: CandidateProfile = {
  displayName: "候选人 A",
  currentRole: "大客户销售主管",
  yearsOfExperience: 5,
  education: "本科 · 市场营销",
  skills: ["B2B销售", "客户开发", "商务谈判", "CRM管理", "大客户维护"],
  highlights: ["制造业客户经验", "新增23家工业客户", "年度目标完成率118%"],
  resumeText: DEMO_RESUME
};

export const DEMO_MATCH: MatchAnalysis = {
  overallScore: 86,
  competencyScore: 88,
  experienceScore: 90,
  industryScore: 84,
  mustHaveScore: 85,
  summary: "候选人的B2B销售、制造业客户开发和目标达成经历与职位核心要求高度重合，建议进入结构化面试，重点核实区域策略与团队管理深度。",
  strengths: ["具备5年B2B销售经历，超过职位最低年限", "有明确的制造业陌生客户开发成果", "熟悉CRM商机管理与长期客户维护", "连续达成销售目标且有量化结果"],
  risks: ["简历未体现正式团队管理人数和管理机制", "区域经验集中在湖北、湖南，对华中其他省份覆盖情况不明确", "大型复杂项目的平均客单价与销售周期未披露"],
  missingInformation: ["团队管理规模", "典型项目客单价", "区域出差意愿", "离职动机与薪资预期"],
  evidence: [
    { conclusion: "具备陌生工业客户开发能力", quote: "通过行业展会、客户转介绍和电话开发新增工业客户23家", confidence: "高" },
    { conclusion: "具备销售目标达成能力", quote: "2024年完成率为118%", confidence: "高" },
    { conclusion: "具备客户过程管理意识", quote: "CRM商机更新及时率保持95%以上", confidence: "高" }
  ],
  interviewSuggestions: ["请拆解一个从零开发制造业客户并最终签约的完整过程。", "销售额从680万增长至1120万，你的个人贡献和外部因素分别是什么？", "如何判断一个区域的客户优先级并分配拜访时间？", "你是否带过团队？如何进行目标拆解和过程辅导？"]
};

export const DEMO_FUNNEL: FunnelData = {
  received: 120,
  screened: 40,
  interviewed: 15,
  offersMade: 5,
  offersAccepted: 4,
  onboarded: 4
};
