import { NextFunction, Request, Response } from "express";

const JsonEncodedBodyData =
  (encodeName?: string) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = JSON.parse(req.body[encodeName || "jsonEncoded"]);
      next();
    } catch (error) {
      next(error);
    }
  };

export default JsonEncodedBodyData;
