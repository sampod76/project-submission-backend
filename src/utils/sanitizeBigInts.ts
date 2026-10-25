export function sanitizeBigInts(obj: any): any {
  if (typeof obj === "bigint") return Number(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeBigInts);
  if (obj && typeof obj === "object")
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [key, sanitizeBigInts(value)]),
    );

  return obj;
}
