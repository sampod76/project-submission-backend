import {
  IPaginationOptions,
  IPaginationResult,
} from "../../interfaces/pagination";

export type { IPaginationResult };

export abstract class AbstractService {
  protected calculatePagination = (
    option: IPaginationOptions,
  ): IPaginationResult => {
    const page = Number(option.page) || 1;
    const limit = Math.min(Number(option.limit) || 10, 100);

    const skip = (page - 1) * limit;

    const sortBy = option.sortBy ?? "createdAt";
    const sortOrder = option.sortOrder ?? "desc";

    return { page, limit, skip, sortBy, sortOrder };
  };
}
