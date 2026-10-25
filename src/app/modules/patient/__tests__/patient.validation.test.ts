import {
  createPatientZodSchema,
  listPatientsZodSchema,
} from "../patient.validation";

const id = "12345678-1234-4abc-8def-123456789abc";

test("accepts valid patient input", () => {
  const result = createPatientZodSchema.safeParse({
    body: {
      name: "Patient",
      phone: "01234567890",
      age: 30,
      gender: "FEMALE",
      patientComplaint: "Headache",
    },
  });
  expect(result.success).toBe(true);
});

test("rejects missing required fields", () => {
  const result = createPatientZodSchema.safeParse({ body: { name: "A" } });
  expect(result.success).toBe(false);
});

test("validates list pagination, sorting, identifiers, and date boundaries", () => {
  const schema = listPatientsZodSchema;
  const query = schema.parse({
    query: {
      search: "  text  ",
      page: "2",
      limit: "100",
      fromDate: "2026-01-01",
      toDate: "2026-01-31",
    },
  }).query;
  expect(query).toMatchObject({
    search: "text",
    page: 2,
    limit: 100,
  });
  expect(query.fromDate).toEqual(new Date("2026-01-01T00:00:00.000Z"));
  for (const invalid of [
    { page: "0" },
    { page: "1.5" },
    { page: "1000001" },
    { limit: "101" },
    { limit: "-1" },
    { sortBy: "password" },
    { sortBy: "missing" },
    { sortOrder: "sideways" },
    { fields: "id,createdAt" },
    { fields: "id,password" },
    { fields: "user" },
    { fields: "" },
    { selectFields: "id" },
    { selectedFields: ["id"] },
    { selectableFields: "id" },
    { select: { id: true } },
    { include: { user: true } },
    { fromDate: "2026-02-30" },
    { fromDate: "2026-02-02", toDate: "2026-02-01" },
    { isDeleted: "true" },
    { where: { isDeleted: true } },
  ])
    expect(schema.safeParse({ query: invalid }).success).toBe(false);
  expect(schema.safeParse({ query: { toDate: "2026-01-31" } }).success).toBe(
    true,
  );
  expect(schema.safeParse({ query: { doctorId: "invalid" } }).success).toBe(
    false,
  );
  expect(schema.safeParse({ query: { gender: "INVALID" } }).success).toBe(
    false,
  );
});
