import type { Prisma, PrismaClient } from "@prisma/client";

export type PrismaTransactionClient = Prisma.TransactionClient;
export type PrismaOrTx = PrismaClient | PrismaTransactionClient;
