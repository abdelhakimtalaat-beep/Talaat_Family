import { describe, it, expect, beforeAll } from "vitest";
import { encrypt, decrypt } from "./crypto";

beforeAll(() => { process.env.TOKEN_ENCRYPTION_KEY = "x".repeat(40); });

describe("token encryption", () => {
  it("round-trips", () => {
    expect(decrypt(encrypt("1//refresh-token"))).toBe("1//refresh-token");
  });
  it("does not store plaintext and uses a fresh IV each time", () => {
    const a = encrypt("secret"), b = encrypt("secret");
    expect(a).not.toContain("secret");
    expect(a).not.toBe(b);
  });
  it("rejects tampered data", () => {
    const parts = encrypt("secret").split(".");
    parts[2] = Buffer.from("tampered").toString("base64");
    expect(() => decrypt(parts.join("."))).toThrow();
  });
});
