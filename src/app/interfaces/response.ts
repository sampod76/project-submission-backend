export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
};

export type PaginatedResult<T> = {
  meta: PaginationMeta;
  data: T[];
};

export type ApiResponse<T> = {
  statusCode?: number;
  success?: boolean;
  message?: string;
  meta?: PaginationMeta;
  data?: T;
};
