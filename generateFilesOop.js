function parseName(input) {
  const isInvalidModuleName =
    input.length > 80 ||
    !/^[A-Za-z][A-Za-z0-9]*(?:-[A-Za-z][A-Za-z0-9]*)*$/.test(input);
  if (isInvalidModuleName)
    throw new Error(
      "Use a module name of 1–80 letters, digits, and single hyphens, starting with a letter.",
    );

  const words = input
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .split("-");
  const camel = words[0] + words.slice(1).map(capitalize).join("");
  const pascal = words.map(capitalize).join("");
  const kebab = words.join("-");
  const upper = words.join("_").toUpperCase();

  const isReservedFileName = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i.test(
    camel,
  );
  if (isReservedFileName)
    throw new Error("Module name is reserved by the file system.");

  const conflictsWithSharedType = [
    "Document",
    "Schema",
    "Types",
    "FilterQuery",
    "ApiError",
    "AbstractService",
    "String",
    "Boolean",
    "Date",
    "Promise",
  ].includes(pascal);
  if (conflictsWithSharedType)
    throw new Error("Module name conflicts with a shared type or class.");

  return { camel, pascal, kebab, upper };
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function templates({ camel: c, pascal: p, upper: u, kebab: k }) {
  return {
    constant: `export const ${u}_SEARCHABLE_FIELDS = ["title"] as const;
export const ${u}_SORTABLE_FIELDS = ["id", "title", "createdAt", "updatedAt"] as const;
`,
    container: `import { ${p}Controller } from "./${k}.controller";
import { ${p}Routes } from "./${k}.route";
import { ${p}Service } from "./${k}.service";
export const ${c}Service = new ${p}Service();
export const ${c}Controller = new ${p}Controller(${c}Service);
export const ${c}Routes = new ${p}Routes(${c}Controller);
`,
    prisma: `model ${p} {
  id String @id @default(uuid()) @db.Uuid
  title String @db.VarChar(100)
  isDeleted Boolean @default(false) @map("is_deleted")
  deletedAt DateTime? @map("deleted_at") @db.Timestamptz(3)
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(3)
  @@index([isDeleted, createdAt(sort: Desc)])
  @@map("${k.replace(/-/g, "_")}s")
}
`,
    validation: `import { z } from "zod";
import { queryDateSchema, uuidSchema } from "../../../global/schema/global.schema";
import { ${u}_SORTABLE_FIELDS } from "./${k}.constant";

const body = z
  .object({
    title: z.string().trim().min(1).max(100),
  })
  .strict();
export const create${p}ZodSchema = z.object({ body });
export const get${p}ZodSchema = z.object({
  params: z.object({ id: uuidSchema }),
});
export const update${p}ZodSchema = z.object({
  params: z.object({ id: uuidSchema }),
  body: body
    .partial()
    .refine(
      value => Object.keys(value).length > 0,
      "At least one field is required",
    ),
});
export const list${p}sZodSchema = z.object({
  query: z
    .object({
      search: z.string().trim().max(100).optional(),
      searchTerm: z.string().trim().max(100).optional(),
      id: uuidSchema.optional(),
      fromDate: queryDateSchema.optional(),
      toDate: queryDateSchema.optional(),
      page: z.coerce.number().int().positive().max(1000000).optional(),
      limit: z.coerce.number().int().positive().max(100).optional(),
      sortBy: z.enum(${u}_SORTABLE_FIELDS).optional(),
      sortOrder: z.enum(["asc", "desc"]).optional(),
    })
    .strict().superRefine((data, ctx) => {
      if (data.fromDate && data.toDate && data.fromDate > data.toDate)
        ctx.addIssue({ code: "custom", path: ["toDate"], message: "toDate must be on or after fromDate" });
    }),
});
export type Create${p}Dto = z.infer<typeof create${p}ZodSchema>["body"];
export type Update${p}Dto = z.infer<typeof update${p}ZodSchema>["body"];
export type List${p}sQuery = z.infer<typeof list${p}sZodSchema>["query"];
`,
    controller: `import { Request } from "express";
import httpStatus from "http-status";
import { AbstractController } from "../../core/abstract/AbstractController";
import type { I${p}Service, ${p}Response, ${p}ListResponse } from "./${k}.interface";
import { create${p}ZodSchema, get${p}ZodSchema, update${p}ZodSchema, list${p}sZodSchema } from "./${k}.validation";
import type { ValidatedResponse } from "../../middlewares/validateRequestZod";
export class ${p}Controller extends AbstractController {
  constructor(private readonly service: I${p}Service) {
    super();
  }
  create = this.catchAsync(async (req: Request, res: ValidatedResponse<typeof create${p}ZodSchema>) => {
    const data = await this.service.create(res.body);
    this.sendResponse<${p}Response>(res, {
      statusCode: httpStatus.CREATED,
      message: "${p} created",
      data,
    });
  });
  list = this.catchAsync(async (req: Request, res: ValidatedResponse<typeof list${p}sZodSchema>) => {
    const { query } = res;
    const result = await this.service.findAll(query);
    this.sendResponse<${p}ListResponse[]>(res, {
      statusCode: httpStatus.OK,
      data: result.data,
      meta: result.meta,
    });
  });
  getById = this.catchAsync(async (req: Request, res: ValidatedResponse<typeof get${p}ZodSchema>) => {
    const data = await this.service.findOne(res.params.id);
    this.sendResponse<${p}Response>(res, { statusCode: httpStatus.OK, data });
  });
  update = this.catchAsync(async (req: Request, res: ValidatedResponse<typeof update${p}ZodSchema>) => {
    const data = await this.service.update(res.params.id, res.body);
    this.sendResponse<${p}Response>(res, {
      statusCode: httpStatus.OK,
      message: "${p} updated",
      data,
    });
  });
  remove = this.catchAsync(async (req: Request, res: ValidatedResponse<typeof get${p}ZodSchema>) => {
    const data = await this.service.softDelete(res.params.id);
    this.sendResponse<${p}Response>(res, {
      statusCode: httpStatus.OK,
      message: "${p} deleted",
      data,
    });
  });
}
`,
    route: `import { AbstractRoute } from "../../core/abstract/AbstractRoute";
import { ${p}Controller } from "./${k}.controller";
import {
  create${p}ZodSchema,
  get${p}ZodSchema,
  list${p}sZodSchema,
  update${p}ZodSchema,
} from "./${k}.validation";
export class ${p}Routes extends AbstractRoute {
  constructor(private readonly controller: ${p}Controller) {
    super();
    this.init();
  }
  protected init(): void {
    this.router
      .route("/")
      .post(
        this.authMiddleware(this.USER_ROLE.ADMIN),
        this.validateRequestZod(create${p}ZodSchema),
        this.controller.create,
      )
      .get(
        this.authMiddleware(this.USER_ROLE.ADMIN),
        this.validateRequestZod(list${p}sZodSchema),
        this.controller.list,
      );

    this.router
      .route("/:id")
      .get(
        this.authMiddleware(this.USER_ROLE.ADMIN),
        this.validateRequestZod(get${p}ZodSchema),
        this.controller.getById,
      )
      .patch(
        this.authMiddleware(this.USER_ROLE.ADMIN),
        this.validateRequestZod(update${p}ZodSchema),
        this.controller.update,
      )
      .delete(
        this.authMiddleware(this.USER_ROLE.ADMIN),
        this.validateRequestZod(get${p}ZodSchema),
        this.controller.remove,
      );
  }
}
`,
    builder: `import type { Prisma } from "@prisma/client";
import { UTCDateFormatter } from "../../../../utils/UTCDateFormatter";
import { escapeLike } from "../../../share/prisma/query-options";
import { ${u}_SEARCHABLE_FIELDS } from "../${k}.constant";
import type { List${p}sQuery } from "../${k}.validation";
export class ${p}QueryBuilder {
  private where: Prisma.${p}WhereInput = { isDeleted: false };
  addSearch(search?: string): this {
    if (!search) return this;
    this.where.OR = ${u}_SEARCHABLE_FIELDS.map(field => ({ [field]: { contains: escapeLike(search), mode: "insensitive" } }));
    return this;
  }
  addFilters(filter: List${p}sQuery): this {
    if (filter.id) this.where.id = filter.id;
    return this;
  }
  addDateRange(fromDate?: Date, toDate?: Date): this {
    if (!fromDate && !toDate) return this;
    this.where.createdAt = { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: new UTCDateFormatter({ date: toDate }).endOfDayUtc() } : {}) };
    return this;
  }
  build(): Prisma.${p}WhereInput { return this.where; }
}
`,
    repository: `import type { Prisma } from "@prisma/client";
import { prisma } from "../../share/prisma/prisma";
import type { PrismaOrTx, PrismaTransactionClient } from "../../share/prisma/transaction";
import type { I${p}Repository } from "./${k}.interface";
export class ${p}Repository implements I${p}Repository {
  create<T extends Prisma.${p}CreateArgs>(args: Prisma.SelectSubset<T, Prisma.${p}CreateArgs>, tx?: PrismaOrTx) { return (tx ?? prisma).${c}.create(args); }
  findMany<T extends Prisma.${p}FindManyArgs>(args: Prisma.SelectSubset<T, Prisma.${p}FindManyArgs>, tx?: PrismaOrTx) { return (tx ?? prisma).${c}.findMany(args); }
  findFirst<T extends Prisma.${p}FindFirstArgs>(args: Prisma.SelectSubset<T, Prisma.${p}FindFirstArgs>, tx?: PrismaOrTx) { return (tx ?? prisma).${c}.findFirst(args); }
  update<T extends Prisma.${p}UpdateArgs>(args: Prisma.SelectSubset<T, Prisma.${p}UpdateArgs>, tx?: PrismaOrTx) { return (tx ?? prisma).${c}.update(args); }
  count<T extends Prisma.${p}CountArgs>(args: Prisma.Subset<T, Prisma.${p}CountArgs>, tx?: PrismaOrTx): ReturnType<typeof prisma.${c}.count<T>> { return (tx ?? prisma).${c}.count(args); }
  transaction<T>(work: (tx: PrismaTransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(work, { isolationLevel: "RepeatableRead" });
  }
}
`,
    interface: `import type { Prisma, ${p} } from "@prisma/client";
import type { RepositoryResult } from "../../share/prisma/repository-result";
import type { PrismaOrTx, PrismaTransactionClient } from "../../share/prisma/transaction";
import type { prisma } from "../../share/prisma/prisma";
import type { PaginatedResult } from "../../interfaces/response";
import type { Create${p}Dto, Update${p}Dto, List${p}sQuery } from "./${k}.validation";
export type ${p}Response = ${p};
export type ${p}ListResponse = ${p};
export interface I${p}Repository {
  create<T extends Prisma.${p}CreateArgs>(args: Prisma.SelectSubset<T, Prisma.${p}CreateArgs>, tx?: PrismaOrTx): Promise<RepositoryResult<Prisma.$${p}Payload, T, "create">>;
  findMany<T extends Prisma.${p}FindManyArgs>(args: Prisma.SelectSubset<T, Prisma.${p}FindManyArgs>, tx?: PrismaOrTx): Promise<RepositoryResult<Prisma.$${p}Payload, T, "findMany">>;
  findFirst<T extends Prisma.${p}FindFirstArgs>(args: Prisma.SelectSubset<T, Prisma.${p}FindFirstArgs>, tx?: PrismaOrTx): Promise<RepositoryResult<Prisma.$${p}Payload, T, "findFirst">>;
  update<T extends Prisma.${p}UpdateArgs>(args: Prisma.SelectSubset<T, Prisma.${p}UpdateArgs>, tx?: PrismaOrTx): Promise<RepositoryResult<Prisma.$${p}Payload, T, "update">>;
  count<T extends Prisma.${p}CountArgs>(args: Prisma.Subset<T, Prisma.${p}CountArgs>, tx?: PrismaOrTx): ReturnType<typeof prisma.${c}.count<T>>;
  transaction<T>(work: (tx: PrismaTransactionClient) => Promise<T>): Promise<T>;
}
export interface I${p}Service {
  create(payload: Create${p}Dto): Promise<${p}Response>;
  findOne(id: string): Promise<${p}Response>;
  findAll(query: List${p}sQuery): Promise<PaginatedResult<${p}ListResponse>>;
  update(id: string, payload: Update${p}Dto): Promise<${p}Response>;
  softDelete(id: string): Promise<${p}Response>;
}
`,
    service: `import { orderBy } from "../../share/prisma/query-options";
import { ${p}QueryBuilder } from "./builders/${p}QueryBuilder";
import httpStatus from "http-status";
import type { PaginatedResult } from "../../interfaces/response";
import { AbstractService } from "../../core/abstract/AbstractService";
import { ApiError } from "../../errors/ApiError";
import { isValidId } from "../../../global/schema/global.schema";
import { ${p}Repository } from "./${k}.repository";
import type { I${p}Service, I${p}Repository, ${p}Response, ${p}ListResponse } from "./${k}.interface";
import type { Create${p}Dto, Update${p}Dto, List${p}sQuery } from "./${k}.validation";
export class ${p}Service extends AbstractService implements I${p}Service {
  constructor(private readonly repository: I${p}Repository = new ${p}Repository()) { super(); }
  async create(payload: Create${p}Dto): Promise<${p}Response> { return await this.repository.create({ data: payload }); }
  async findOne(id: string): Promise<${p}Response> {
    const hasValidId = isValidId(id);
    if (!hasValidId) throw new ApiError(400, "Invalid id");
    const record = await this.repository.findFirst({ where: { id: id, isDeleted: false } });
    if (!record) throw new ApiError(httpStatus.NOT_FOUND, "${p} not found");
    return record;
  }
  async findAll(query: List${p}sQuery): Promise<PaginatedResult<${p}ListResponse>> {
    const pagination = this.calculatePagination(query);
    const where = new ${p}QueryBuilder().addSearch(query.search ?? query.searchTerm).addFilters(query).addDateRange(query.fromDate, query.toDate).build();
    const { data, total } = await this.repository.transaction(async tx => {
      const [data, total] = await Promise.all([
        this.repository.findMany({ where, select: { id: true, title: true, isDeleted: true, deletedAt: true, createdAt: true, updatedAt: true }, skip: pagination.skip, take: pagination.limit, orderBy: orderBy(pagination) }, tx),
        this.repository.count({ where }, tx),
      ]);
      return { data, total };
    });
    return { data, meta: { page: pagination.page, limit: pagination.limit, total } };
  }
  async update(id: string, payload: Update${p}Dto): Promise<${p}Response> {
    await this.findOne(id);
    return await this.repository.update({ where: { id: id, isDeleted: false }, data: payload });
  }
  async softDelete(id: string): Promise<${p}Response> {
    await this.findOne(id);
    return await this.repository.update({ where: { id: id, isDeleted: false }, data: { isDeleted: true, deletedAt: new Date() } });
  }
}
`,
  };
}

async function generateModule(name) {
  const names = parseName(name);
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const modulesDirectory = path.join(__dirname, "src", "app", "modules");
  const destination = path.join(modulesDirectory, names.kebab);
  const files = templates(names);
  const schema = files.prisma;
  delete files.prisma;
  const schemaDirectory = path.join(__dirname, "prisma", "models");
  const schemaPath = path.join(schemaDirectory, `${names.kebab}.prisma`);
  await fs.mkdir(schemaDirectory, { recursive: true });
  try {
    await fs.access(schemaPath);
    throw new Error(`Prisma schema already exists: ${schemaPath}`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const prettier = await import("prettier");
  const options = await prettier.resolveConfig(__filename);
  for (const suffix of Object.keys(files)) {
    files[suffix] = await prettier.format(files[suffix], {
      ...options,
      parser: "typescript",
    });
  }
  await fs.mkdir(modulesDirectory, { recursive: true });
  const existing = await fs.readdir(modulesDirectory);
  const moduleAlreadyExists = existing.some(
    entry => entry.toLowerCase() === names.kebab.toLowerCase(),
  );
  if (moduleAlreadyExists)
    throw new Error(`Module already exists: ${destination}`);

  await fs.mkdir(destination);
  let schemaCreated = false;
  try {
    await fs.writeFile(schemaPath, schema, { encoding: "utf8", flag: "wx" });
    schemaCreated = true;
    for (const [suffix, content] of Object.entries(files)) {
      const filePath =
        suffix === "builder"
          ? path.join(destination, "builders", `${names.pascal}QueryBuilder.ts`)
          : path.join(destination, `${names.kebab}.${suffix}.ts`);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content, { encoding: "utf8", flag: "wx" });
    }
  } catch (error) {
    try {
      const relative = path.relative(modulesDirectory, destination);
      const isUnsafeCleanupPath =
        !relative || relative.startsWith("..") || path.isAbsolute(relative);
      if (isUnsafeCleanupPath)
        throw new Error("Unsafe cleanup path", { cause: error });
      await fs.rm(destination, { recursive: true, force: true });
      const canRemoveSchema =
        schemaCreated && path.dirname(schemaPath) === schemaDirectory;
      if (canRemoveSchema) await fs.rm(schemaPath, { force: true });
    } catch (cleanupError) {
      throw new Error(
        `${error.message}; cleanup failed for ${destination}: ${cleanupError.message}`,
        { cause: cleanupError },
      );
    }
    throw error;
  }
  console.log(`Created ${Object.keys(files).length} files in ${destination}`);
  console.log(
    "Scaffold fields: title, isDeleted, deletedAt, and timestamps. Customize the Prisma schema and validation for your module. Routes initially allow ADMIN only.",
  );
  console.log("Register manually in src/app/routes/index_route.ts:");
  console.log(
    `import { ${names.camel}Routes } from "../modules/${names.kebab}/${names.kebab}.container";`,
  );
  console.log(
    `Add to moduleRoutes: { path: "/${names.kebab}s", route: ${names.camel}Routes.router },`,
  );
}

async function main() {
  const args = process.argv.slice(2);
  const isHelpRequest = args.length === 1 && ["--help", "-h"].includes(args[0]);
  if (isHelpRequest) {
    console.log(
      "Usage: node generateFilesOop.js <module-name>\n       pnpm generate:module <module-name>\nAccepts camelCase, PascalCase, or kebab-case; folders and files use kebab-case. Run pnpm prisma:generate and pnpm db:migrate after creating a module.",
    );
    return;
  }
  if (args.length !== 1)
    throw new Error(
      "Usage: node generateFilesOop.js <module-name> or pnpm generate:module <module-name>",
    );

  await generateModule(args[0]);
}

main().catch(error => {
  console.error(`Module generation failed: ${error.message}`);
  process.exitCode = 1;
});
