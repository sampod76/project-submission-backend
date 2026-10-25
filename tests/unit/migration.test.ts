import { Prisma } from "@prisma/client";
import { isValidId, uuidSchema } from "../../src/global/schema/global.schema";
import { handlePrismaError } from "../../src/app/errors/handle-prisma-error";

describe("UUID validation and Prisma errors", () => {
  test("accepts standard UUID strings and rejects legacy and malformed ids", () => {
    const id = "12345678-1234-4abc-8def-123456789abc";
    expect(isValidId(id)).toBe(true);
    expect(uuidSchema.parse(id.toUpperCase())).toBe(id.toUpperCase());
    expect(isValidId("abcdef000000000000000001")).toBe(false);
    expect(uuidSchema.safeParse("not-an-id").success).toBe(false);
  });
  test("maps database uniqueness errors to API field names", () => {
    const error = new Prisma.PrismaClientKnownRequestError("unique", {
      code: "P2002",
      clientVersion: "7.4.2",
      meta: { target: ["medical_registration_no"] },
    });
    expect(handlePrismaError(error)).toMatchObject({
      statusCode: 409,
      message: "Duplicate medicalRegistrationNo value",
    });
  });
});
