import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Database is ready. No demo records were inserted.");
}

main().finally(() => prisma.$disconnect());
