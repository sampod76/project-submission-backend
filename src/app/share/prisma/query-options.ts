import type { Prisma } from "@prisma/client";
import type { IPaginationResult } from "../../interfaces/pagination";

export function orderBy({ sortBy, sortOrder }: IPaginationResult) {
  const field = sortBy;
  const order: Prisma.SortOrder = sortOrder;
  return [
    { [field]: order },
    ...(field === "id" ? [] : [{ id: "asc" as const }]),
  ];
}

export const escapeLike = (value: string): string =>
  value.replace(/[\\%_]/g, "\\$&");
