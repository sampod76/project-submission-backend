import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "../../config/env";

const createClient = () =>
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
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
