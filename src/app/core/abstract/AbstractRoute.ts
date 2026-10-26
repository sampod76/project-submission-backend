import express, { Router } from "express";
import type { AuthMiddleware } from "../../middlewares/authMiddleware";

import validateRequestZod from "../../middlewares/validateRequestZod";

import { USER_ROLE } from "../../../global/enums/users";

export abstract class AbstractRoute {
  public readonly router: Router = express.Router();

  constructor(protected readonly authMiddleware: AuthMiddleware) {}

  protected readonly validateRequestZod = validateRequestZod;

  protected readonly USER_ROLE = USER_ROLE;

  protected init(): void {}
}
