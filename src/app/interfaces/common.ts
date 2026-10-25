import { JwtPayload } from "jsonwebtoken";
import { IGenericErrorMessage } from "./error";
import { IUserRef } from "./user.ref";

export interface IJwtAuthUser extends JwtPayload, IUserRef {}

export type IGenericErrorResponse = {
  statusCode: number;
  message: string;
  errorMessages: Array<IGenericErrorMessage>;
};

export type ServiceContext = {
  user?: IUserRef;
  timeZone: string;
};
