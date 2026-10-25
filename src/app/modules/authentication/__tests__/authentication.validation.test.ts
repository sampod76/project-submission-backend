import { AuthValidation } from "../authentication.validation";

test("accepts valid login credentials and normalizes email", () => {
  const result = AuthValidation.loginZodSchema.safeParse({
    body: { email: "DOCTOR@example.com", password: "Password123" },
  });
  expect(result.success).toBe(true);
  if (result.success) expect(result.data.body.email).toBe("doctor@example.com");
});

test("rejects an invalid email and an empty password", () => {
  const result = AuthValidation.loginZodSchema.safeParse({
    body: { email: "invalid", password: "" },
  });
  expect(result.success).toBe(false);
});
