import type {
  GetResult,
  Operation,
  OperationPayload,
} from "@prisma/client/runtime/client";

export type RepositoryResult<
  Payload extends OperationPayload,
  Args,
  Op extends Operation,
> = GetResult<Payload, Args, Op>;
