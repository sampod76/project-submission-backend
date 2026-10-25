import { ErrorRequestHandler } from "express";
import httpStatus from "http-status";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { env } from "../config/env";
import { ApiError } from "../errors/ApiError";
import { handlePrismaError } from "../errors/handle-prisma-error";
import handleZodError from "../errors/handleZodError";
import ServiceError from "../errors/ServiceError";
import { IGenericErrorMessage } from "../interfaces/error";
import { errorLogger } from "../share/logger";

const globalErrorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  let statusCode: number = httpStatus.INTERNAL_SERVER_ERROR;
  let message = "Something went wrong";
  let errorMessage: IGenericErrorMessage[] = [];
  let errorCode: string | undefined;

  if (error instanceof ZodError) {
    const simplified = handleZodError(error);
    statusCode = simplified.statusCode;
    message = simplified.message;
    errorMessage = simplified.errorMessages;
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const simplified = handlePrismaError(error);
    statusCode = simplified.statusCode;
    message = simplified.message;
    errorMessage = simplified.errorMessages;
  } else if (error?.name === "JsonWebTokenError") {
    statusCode = httpStatus.UNAUTHORIZED;
    message = "Unauthorized access";
    errorCode = "INVALID_TOKEN";
  } else if (error?.name === "TokenExpiredError") {
    statusCode = httpStatus.UNAUTHORIZED;
    message = "Your session has expired. Please log in again.";
    errorCode = "TOKEN_EXPIRED";
  } else if (error instanceof ApiError) {
    statusCode = error.statusCode;
    message = error.userMessage;
    errorCode = error.errorCode;
    errorMessage = [{ path: "", message: error.userMessage }];
  } else if (error instanceof ServiceError) {
    statusCode = error.statusCode;
    message = error.message;
    errorMessage = error.errorMessage || [];
  } else if (error instanceof Error) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message =
      env.NODE_ENV === "production"
        ? "Something went wrong. Please try again later."
        : error.message;
    errorCode = "INTERNAL_SERVER_ERROR";
    errorMessage =
      env.NODE_ENV === "production"
        ? []
        : [{ path: "", message: error.message }];
  }

  if (error instanceof ApiError)
    errorLogger.error({
      type: "ApiError",
      statusCode: error.statusCode,
      userMessage: error.userMessage,
      developerMessage: error.developerMessage || error.message,
      errorCode: error.errorCode,
      details: error.details,
      stack: error.stack,
      method: req.method,
      url: req.originalUrl,
    });
  else
    errorLogger.error({
      type: error?.constructor?.name || "UnknownError",
      statusCode,
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
      stack: error instanceof Error ? error.stack : undefined,
      method: req.method,
      url: req.originalUrl,
    });

  return res.status(statusCode).json({
    success: false,
    message,
    ...(errorCode && { errorCode }),
    errorMessage,
    ...(env.NODE_ENV !== "production" && {
      stack: error instanceof Error ? error.stack : undefined,
      ...(error instanceof ApiError && {
        developerMessage: error.developerMessage,
        details: error.details,
      }),
    }),
  });
};

export default globalErrorHandler;
