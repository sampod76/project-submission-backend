import { v4 as uuidV4, version as uuidVersion, validate } from "uuid";
export const uuidGenerator = () => {
  return crypto.randomUUID();
};

export class UuidBuilder {
  uuid: string;
  uuidType: "crypto" | "uuid";
  constructor(uidType: "crypto" | "uuid" = "crypto") {
    this.uuidType = uidType;
    if (this.uuidType === "crypto") this.uuid = crypto.randomUUID();
    else this.uuid = uuidV4();
  }
  generateUuid(): string {
    if (this.uuidType === "crypto") return uuidGenerator();

    return uuidV4();
  }
}

export class UuidUtls {
  readonly uuid: string;
  constructor(uuid: string) {
    this.uuid = uuid;
  }
  isUuidValid(): boolean {
    return validate(this.uuid);
  }

  getUuidVersion(): number {
    const version = uuidVersion(this.uuid);
    if (version > 0) return version;

    return 0;
  }
}

const CUID_REGEX = /^c[a-z0-9]{20,30}$/i;

const SLUG_REGEX = /^[\p{L}\p{M}\p{N}]+(?:-[\p{L}\p{M}\p{N}]+)*$/u;

export type DetectResult =
  | { type: "uuid" }
  | { type: "cuid" }
  | { type: "slug" }
  | { type: "unknown" };

export class IDTypeDetector {
  private readonly value: string;

  constructor(value: string) {
    this.value = value.trim();
  }

  private isUuid(): boolean {
    return validate(this.value);
  }

  private isCuid(): boolean {
    return CUID_REGEX.test(this.value);
  }

  private isSlug(): boolean {
    return SLUG_REGEX.test(this.value);
  }

  detect(): DetectResult {
    if (this.isUuid())
      return {
        type: "uuid",
      };

    if (this.isCuid())
      return {
        type: "cuid",
      };

    if (this.isSlug())
      return {
        type: "slug",
      };

    return {
      type: "unknown",
    };
  }
}
