import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "../../config/env";

const createClient = () =>
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
  });
export type AppPrismaClient = ReturnType<typeof createClient>;

export class PrismaClientSingleton {
  private static instance: AppPrismaClient | undefined;

  static getInstance(): AppPrismaClient {
    return (this.instance ??= createClient());
  }
}

export const prisma = PrismaClientSingleton.getInstance();
