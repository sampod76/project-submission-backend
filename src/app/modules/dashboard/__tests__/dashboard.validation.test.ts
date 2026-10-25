import { dashboardOverviewZodSchema } from "../dashboard.validation";

test("accepts a valid follow-up date", () => {
  const result = dashboardOverviewZodSchema.safeParse({
    query: { followUpDate: "2026-10-17" },
  });
  expect(result.success).toBe(true);
  if (result.success)
    expect(result.data.query.followUpDate).toEqual(
      new Date("2026-10-17T00:00:00.000Z"),
    );
});

test("rejects an impossible date", () => {
  const result = dashboardOverviewZodSchema.safeParse({
    query: { followUpDate: "2026-02-30" },
  });
  expect(result.success).toBe(false);
});
