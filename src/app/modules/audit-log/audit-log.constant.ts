import type { Prisma } from "@prisma/client";
export const AUDIT_LOG_SELECT = {
  id: true,
  actorUserId: true,
  action: true,
  entityType: true,
  entityId: true,
  oldData: true,
  newData: true,
  ipAddress: true,
  userAgent: true,
  createdAt: true,
  actor: { select: { id: true, email: true, role: true } },
} as const satisfies Prisma.AuditLogSelect;
export function sanitizeAuditData(value: Prisma.JsonValue): Prisma.JsonValue {
  if (Array.isArray(value)) return value.map(sanitizeAuditData);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        key,
        /password|passwd|token|secret|authorization|cookie|credential|apikey|privatekey|otp|databaseurl|connectionstring/i.test(
          key.replace(/[^a-z0-9]/gi, ""),
        )
          ? "[REDACTED]"
          : sanitizeAuditData(nested ?? null),
      ]),
    );
  return value;
}
