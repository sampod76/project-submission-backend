import type { IMentorService } from "./mentor.interface";
import { AbstractService } from "../../core/abstract/AbstractService";
import { orderBy } from "../../share/prisma/query-options";
import { mentorRepository } from "./mentor.repository";
import type { IMentorRepository } from "./mentor.interface";
import { MENTOR_SELECT } from "./mentor.constant";
import type { ListMentorsQuery, CreateMentorDto } from "./mentor.validation";
import { MentorQueryBuilder } from "./builders/MentorQueryBuilder";
import type { IUserService } from "../user/user.interface";
import type { IUserRef } from "../../interfaces/user.ref";
import { ApiError } from "../../errors/ApiError";
import { adminRepository } from "../admin/admin.repository";
import type { IAdminRepository } from "../admin/admin.interface";
export class MentorService extends AbstractService implements IMentorService {
  constructor(
    private readonly users: IUserService,
    private readonly repository: IMentorRepository = mentorRepository,
    private readonly admins: IAdminRepository = adminRepository,
  ) {
    super();
  }
  async create(dto: CreateMentorDto, authUser: IUserRef) {
    if (authUser.role !== "ADMIN") throw new ApiError(403, "Forbidden access");
    return this.repository.transaction(async tx => {
      const admin = await this.admins.findFirst(
        {
          where: {
            userId: authUser.userId,
            isDeleted: false,
            user: { isActive: true, isDeleted: false, role: "ADMIN" },
          },
          select: { id: true },
        },
        tx,
      );
      if (!admin)
        throw new ApiError(403, "Active administrator profile required");
      const user = await this.users.createAccount(
        { email: dto.email, password: dto.password, role: "MENTOR" },
        tx,
      );
      return this.repository.create(
        {
          data: {
            userId: user.id,
            firstName: dto.firstName,
            lastName: dto.lastName,
            phone: dto.phone,
            gender: dto.gender,
            bio: dto.bio,
            createdByAdminId: admin.id,
          },
          select: MENTOR_SELECT,
        },
        tx,
      );
    });
  }
  async findAll(query: ListMentorsQuery) {
    const pagination = this.calculatePagination(query);
    const where = new MentorQueryBuilder()
      .addSearch(query.searchTerm ?? query.search)
      .build();
    return this.repository.transaction(async tx => {
      const [data, total] = await Promise.all([
        this.repository.findMany(
          {
            where,
            select: MENTOR_SELECT,
            skip: pagination.skip,
            take: pagination.limit,
            orderBy: orderBy(pagination),
          },
          tx,
        ),
        this.repository.count({ where }, tx),
      ]);
      return {
        data,
        meta: { page: pagination.page, limit: pagination.limit, total },
      };
    });
  }
}
