import { prisma } from "../share/prisma/prisma";
import { logger } from "../share/logger";

export async function connectDatabase() {
  await prisma.$connect();
  logger.info("database -> PostgreSQL connected");
  return prisma;
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
