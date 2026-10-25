import { NextFunction, Request, Response } from "express";
import { PAGINATION_FIELDS } from "../../../global/constant/pagination";
import type { ApiResponse } from "../../interfaces/response";

export abstract class AbstractController {
  protected readonly PAGINATION_FIELDS = PAGINATION_FIELDS;

  protected catchAsync =
    <Locals extends Record<string, unknown>>(
      fn: (
        req: Request,
        res: Response<unknown, Locals>,
        next: NextFunction,
      ) => Promise<void>,
    ) =>
    async (
      req: Request,
      res: Response<unknown, Locals>,
      next: NextFunction,
    ): Promise<void> => {
      try {
        await fn(req, res, next);
      } catch (error) {
        next(error);
      }
    };

  protected sendResponse = <T>(
    res: Response<unknown>,
    payload: ApiResponse<T>,
  ): void => {
    res.status(payload.statusCode ?? 200).json({
      success: payload.success ?? true,
      statusCode: payload.statusCode ?? 200,
      message: payload.message ?? "",
      meta: payload.meta ?? undefined,
      data: payload.data ?? null,
    });
  };

  protected pick = <T extends Record<string, unknown>, K extends keyof T>(
    obj: T,
    keys: K[],
  ): Partial<T> => {
    const finalObj: Partial<T> = {};

    for (const key of keys) {
      if (key in obj) finalObj[key] = obj[key];
    }

    return finalObj;
  };
}
