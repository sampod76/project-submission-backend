import crypto from "crypto";

export class CryptoHashOop<T> {
  public data: T;
  constructor(data: T) {
    this.data = data;
  }

  getHash(algorithm?: string): string {
    const hash = crypto.createHash(algorithm || "shake256");
    hash.update(JSON.stringify(this.data));
    return hash.digest("hex");
  }
  getHashWithSalt(salt: string, algorithm?: string): string {
    const hash = crypto.createHash(algorithm || "shake256");
    hash.update(JSON.stringify(this.data) + salt);
    return hash.digest("hex");
  }
}
