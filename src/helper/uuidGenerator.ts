import { v4 as uuidv4 } from "uuid";

export const uuidv4Generator = ({
  format,
}: {
  format?: "uuidv4" | "crypto";
}) => {
  if (format?.includes("uuid")) return uuidv4();
  return crypto.randomUUID();
};
