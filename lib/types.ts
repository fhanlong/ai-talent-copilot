export type Competency = {
  name: string;
  description: string;
  importance: number;
};

export type JDAnalysis = {
  jobTitle: string;
  jobType: string;
  summary: string;
  competencies: Competency[];
  mustHave: string[];
  preferred: string[];
  interviewFocus: string[];
  ambiguities: string[];
};

export type CandidateProfile = {
  displayName: string;
  currentRole: string;
  yearsOfExperience: number;
  education: string;
  skills: string[];
  highlights: string[];
  resumeText: string;
};

export type MatchAnalysis = {
  overallScore: number;
  competencyScore: number;
  experienceScore: number;
  industryScore: number;
  mustHaveScore: number;
  strengths: string[];
  risks: string[];
  missingInformation: string[];
  evidence: { conclusion: string; quote: string; confidence: "高" | "中" | "低" }[];
  interviewSuggestions: string[];
  summary: string;
};

export type InterviewQuestion = {
  question: string;
  competency: string;
  why: string;
  followUps: string[];
  positiveSignals: string[];
  riskSignals: string[];
};

export type InterviewGuide = {
  duration: number;
  opening: string;
  questions: InterviewQuestion[];
  evaluationDimensions: { name: string; guidance: string; weight: number }[];
};

export type FunnelData = {
  received: number;
  screened: number;
  interviewed: number;
  offersMade: number;
  offersAccepted: number;
  onboarded: number;
};

export type FunnelRates = {
  screen: number;
  interview: number;
  offer: number;
  accept: number;
  onboard: number;
  overall: number;
};

export type FunnelAnalysis = {
  bottleneck: string;
  conversionRate: number;
  lostCount: number;
  severity: "高风险" | "需关注" | "相对健康";
  possibleCauses: string[];
  recommendations: string[];
  summary: string;
};
