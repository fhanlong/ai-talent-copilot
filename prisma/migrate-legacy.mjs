import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const legacyCandidates = await prisma.candidate.findMany({
    where: { jobId: { not: null }, applications: { none: {} } },
    select: { id: true, jobId: true },
  });
  if (!legacyCandidates.length) return;
  await prisma.application.createMany({
    data: legacyCandidates.map((candidate) => ({ candidateId: candidate.id, jobId: candidate.jobId, stage: "RECEIVED", source: "旧版本数据迁移" })),
  });
  console.log(`Migrated ${legacyCandidates.length} legacy candidate application(s).`);
}

main().finally(() => prisma.$disconnect());
