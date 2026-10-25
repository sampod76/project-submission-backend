import type { Prisma } from "@prisma/client";
import type { MentorRepository } from "./mentor.repository";
import type { MENTOR_SELECT } from "./mentor.constant";
export type IMentorRepository = Pick<MentorRepository, keyof MentorRepository>;
export type MentorResponse = Prisma.MentorGetPayload<{
  select: typeof MENTOR_SELECT;
}>;
import type { IUserRef } from "../../interfaces/user.ref";
import type { PaginatedResult } from "../../interfaces/response";
import type { CreateMentorDto, ListMentorsQuery } from "./mentor.validation";
export interface IMentorService {
  create(dto: CreateMentorDto, authUser: IUserRef): Promise<MentorResponse>;
  findAll(query: ListMentorsQuery): Promise<PaginatedResult<MentorResponse>>;
}
