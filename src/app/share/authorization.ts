import { USER_ROLE } from "../../global/enums/users";
import type { IUserRef } from "../interfaces/user.ref";
import { ApiError } from "../errors/ApiError";

export function requireAdmin(actor: IUserRef | undefined): void {
  if (actor?.role !== USER_ROLE.ADMIN)
    throw new ApiError(403, "Administrator access required");
}

export function requireManagement(actor: IUserRef): void {
  const isAdmin = actor?.role === USER_ROLE.ADMIN;
  const isMentor = actor?.role === USER_ROLE.MENTOR;
  if (!isAdmin && !isMentor)
    throw new ApiError(403, "Management access required");
}

export function authorizeAccount(actor: IUserRef, targetRole: USER_ROLE): void {
  requireManagement(actor);
  const isMentor = actor.role === USER_ROLE.MENTOR;
  const isStudentAccount = targetRole === USER_ROLE.STUDENT;
  if (isMentor && !isStudentAccount)
    throw new ApiError(403, "You cannot manage this account");
}
