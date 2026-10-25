import type { Prisma } from "@prisma/client";
import type { IUserRepository } from "../../src/app/modules/user/user.interface";
import type { IDoctorRepository } from "../../src/app/modules/doctor/doctor.interface";
import type { IPatientRepository } from "../../src/app/modules/patient/patient.interface";
import type { PrismaTransactionClient } from "../../src/app/share/prisma/transaction";

// Compiled by strict tsc; never performs database operations.
async function projections(
  users: IUserRepository,
  doctors: IDoctorRepository,
  patientsRepository: IPatientRepository,
  tx: PrismaTransactionClient,
) {
  const user = await users.findFirst(
    {
      where: { id: "00000000-0000-4000-8000-000000000001" },
      select: { email: true },
    },
    tx,
  );
  if (user) {
    const email: string = user.email;
    // @ts-expect-error passwords must not appear in an email-only projection
    user.password;
    void email;
  }
  const doctor = await doctors.findFirst(
    { include: { patients: { select: { name: true } } } },
    tx,
  );
  const patients: { name: string }[] | undefined = doctor?.patients;
  // @ts-expect-error Prisma must reject nonexistent columns
  await doctors.findMany({ select: { nonexistentColumn: true } });
  const args: Prisma.DoctorCountArgs = { where: { isDeleted: false } };
  const counts = await doctors.count({ select: { _all: true, id: true } }, tx);
  const total: number = counts._all;
  // @ts-expect-error unrequested count fields must not appear
  counts.name;
  const groups = await patientsRepository.groupBy(
    { by: ["gender"], _count: true },
    tx,
  );
  const gender: string = groups[0].gender;
  const groupCount: number = groups[0]._count;
  // @ts-expect-error ungrouped fields must not appear in grouped results
  groups[0].patientComplaint;
  // @ts-expect-error groupBy must reject nonexistent model columns
  await patientsRepository.groupBy({ by: ["nonexistentColumn"] }, tx);
  void [total, gender, groupCount];
  return { patients, count: await doctors.count(args, tx) };
}
test("repository projection contracts compile", () => {
  expect(typeof projections).toBe("function");
});
