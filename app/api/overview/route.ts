import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildActualFunnel, pipelineProgress, stageIndex, stageLabel } from "@/lib/recruiting";
import { buildFunnelAnalysis, getFunnelRates } from "@/lib/funnel-analysis";

export async function GET() {
  const [jobs, candidates, matches, upcomingInterviews] = await Promise.all([
    db.job.findMany({
      where: { status: "ACTIVE" },
      include: { applications: { select: { stage: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    db.candidate.count(),
    db.matchAnalysis.findMany({ select: { overallScore: true } }),
    db.interviewSchedule.count({ where: { status: { not: "CANCELLED" }, startsAt: { gte: new Date() } } }),
  ]);
  const applications = jobs.flatMap((job) => job.applications);
  const funnel = buildActualFunnel(applications);
  const rates = getFunnelRates(funnel);
  const analysis = buildFunnelAnalysis(funnel);
  const positions = jobs.map((job) => {
    const furthest = job.applications.reduce((current, item) => stageIndex(item.stage) > stageIndex(current) ? item.stage : current, "RECEIVED");
    return {
      id: job.id,
      title: job.title,
      department: job.department,
      candidateCount: job.applications.length,
      stage: job.applications.length ? stageLabel(furthest) : "等待候选人",
      progress: pipelineProgress(job.applications),
    };
  });
  const averageMatch = matches.length ? Math.round(matches.reduce((sum, match) => sum + match.overallScore, 0) / matches.length) : null;
  return NextResponse.json({
    stats: {
      activePositions: jobs.length,
      candidates,
      receivedResumes: funnel.received,
      pendingInterviews: upcomingInterviews,
      aiAnalyses: matches.length,
    },
    positions,
    funnel,
    rates,
    averageMatch,
    insight: funnel.received ? analysis : null,
  });
}
