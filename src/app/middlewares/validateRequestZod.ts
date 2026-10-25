import { NextFunction, Request, Response } from "express";
import { AnyZodObject, ZodEffects, z } from "zod";

type RequestSchema = AnyZodObject | ZodEffects<AnyZodObject>;

export type ValidatedResponse<S extends RequestSchema> = Response<
  unknown,
  { validated: z.output<S> }
>;

const validateRequestZod =
  <S extends RequestSchema>(schema: S) =>
  async (
    req: Request,
    res: ValidatedResponse<S>,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
        cookies: req.cookies,
      });
      // https://app.notion.com/p/sampod/Interview-question-3fd7a1bce8f5809c9e6efd1e9ca85dff?source=copy_link#3fd7a1bce8f58028b45bcd0ec84b318e
      res.locals.validated = parsed;
      next();
    } catch (error) {
      next(error);
    }
  };

export default validateRequestZod;
