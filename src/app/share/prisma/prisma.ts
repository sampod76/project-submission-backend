import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "../../config/env";

const createClient = () =>
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: env.DATABASE_URL,
      // Prisma 7 uses pg's pool settings; URL connect_timeout does not set this.
      connectionTimeoutMillis: 20_000,
    }),
  });
export type AppPrismaClient = ReturnType<typeof createClient>;

export class PrismaClientSingleton {
  private static instance: AppPrismaClient;

  static getInstance(): AppPrismaClient {
    if (!this.instance) {
      this.instance = createClient();
    }

    return this.instance;
  }
}

export const prisma = PrismaClientSingleton.getInstance();
