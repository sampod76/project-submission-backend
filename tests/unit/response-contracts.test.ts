import type {
  ApiResponse,
  PaginatedResult,
} from "../../src/app/interfaces/response";
import type { AdminDetailResponse } from "../../src/app/modules/admin/admin.interface";
import type {
  AuthProfile,
  AuthResult,
} from "../../src/app/modules/authentication/authentication.interface";
import type { AuthenticationService } from "../../src/app/modules/authentication/authentication.service";
import type { DashboardResponse } from "../../src/app/modules/dashboard/dashboard.interface";
import type { DashboardService } from "../../src/app/modules/dashboard/dashboard.service";
import type { DoctorDetailResponse } from "../../src/app/modules/doctor/doctor.interface";
import type { DoctorService } from "../../src/app/modules/doctor/doctor.service";
import type {
  PatientDetailResponse,
  PatientListResponse,
} from "../../src/app/modules/patient/patient.interface";
import type { PatientService } from "../../src/app/modules/patient/patient.service";
import type {
  UserListResponse,
  UserResponse,
} from "../../src/app/modules/user/user.interface";
import type { UserService } from "../../src/app/modules/user/user.service";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

function assertType<T extends true>(value: T): void {
  expect(value).toBe(true);
}

test("public user and nested account types exclude authentication secrets", () => {
  assertType<Equal<Extract<keyof UserResponse, "password" | "_id">, never>>(
    true,
  );
  assertType<Equal<Extract<keyof UserListResponse, "password">, never>>(true);
  assertType<Equal<Extract<keyof AuthProfile, "password">, never>>(true);
  assertType<Equal<Extract<keyof AuthResult["user"], "password">, never>>(true);
  assertType<
    Equal<Extract<keyof AdminDetailResponse["user"], "password">, never>
  >(true);
  assertType<
    Equal<Extract<keyof DoctorDetailResponse["user"], "password">, never>
  >(true);
  assertType<
    Equal<Extract<keyof DoctorDetailResponse["creator"], "password">, never>
  >(true);
});

test("service results preserve pagination, nested selections and nullability", () => {
  assertType<
    Equal<
      Awaited<ReturnType<UserService["findAll"]>>,
      PaginatedResult<UserListResponse>
    >
  >(true);
  assertType<
    Equal<Awaited<ReturnType<UserService["findByEmail"]>>, UserResponse | null>
  >(true);
  assertType<Equal<Awaited<ReturnType<UserService["findOne"]>>, UserResponse>>(
    true,
  );
  assertType<
    Equal<Awaited<ReturnType<DoctorService["findOne"]>>, DoctorDetailResponse>
  >(true);
  assertType<
    Equal<Awaited<ReturnType<PatientService["findOne"]>>, PatientDetailResponse>
  >(true);
  assertType<
    Equal<Awaited<ReturnType<AuthenticationService["profile"]>>, AuthProfile>
  >(true);
  assertType<
    Equal<
      Awaited<ReturnType<DashboardService["getOverview"]>>,
      DashboardResponse
    >
  >(true);
  assertType<
    Equal<
      Extract<keyof NonNullable<PatientListResponse["doctor"]>, "phone">,
      never
    >
  >(true);
  assertType<
    Equal<Extract<keyof PatientDetailResponse["doctor"], "phone">, never>
  >(true);
  assertType<
    Equal<
      Extract<
        keyof PatientListResponse,
        "patientComplaint" | "address" | "notes" | "updatedAt"
      >,
      never
    >
  >(true);
  assertType<Equal<PatientListResponse["id"], string>>(true);
  assertType<Equal<UserListResponse["email"], string>>(true);
  assertType<
    Equal<NonNullable<ApiResponse<UserResponse[]>["data"]>, UserResponse[]>
  >(true);
});
