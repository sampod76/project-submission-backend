import { Prisma } from "@prisma/client";
import type { IGenericErrorResponse } from "../interfaces/common";

const apiFields: Record<string, string> = {
  user_id: "userId",
  medical_registration_no: "medicalRegistrationNo",
  doctor_id: "doctorId",
};
export function handlePrismaError(
  error: Prisma.PrismaClientKnownRequestError,
): IGenericErrorResponse {
  if (error.code === "P2002") {
    const target = error.meta?.target;
    const column =
      Array.isArray(target) && typeof target[0] === "string"
        ? target[0]
        : "field";
    const field = apiFields[column] ?? column;
    const message = `Duplicate ${field} value`;
    return {
      statusCode: 409,
      message,
      errorMessages: [{ path: field, message }],
    };
  }
  if (error.code === "P2025")
    return {
      statusCode: 404,
      message: "Record not found",
      errorMessages: [{ path: "", message: "Record not found" }],
    };
  if (error.code === "P2003")
    return {
      statusCode: 400,
      message: "Invalid reference",
      errorMessages: [
        { path: "", message: "Referenced record does not exist" },
      ],
    };
  return {
    statusCode: 500,
    message: "Something went wrong",
    errorMessages: [],
  };
}
