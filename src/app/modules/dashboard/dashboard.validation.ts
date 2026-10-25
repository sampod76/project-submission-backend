import z from "zod";
import { queryDateSchema } from "../../../global/schema/global.schema";

export const dashboardOverviewZodSchema = z.object({
  query: z
    .object({
      followUpDate: queryDateSchema.optional(),
    })
    .strict(),
});

export type DashboardOverviewQuery = z.infer<
  typeof dashboardOverviewZodSchema
>["query"];
