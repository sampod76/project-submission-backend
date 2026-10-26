import { prisma } from "../../share/prisma/prisma";
import { StudentRepository } from "./student.repository";
import { StudentService } from "./student.service";
import { StudentController } from "./student.controller";

export const studentRepository = new StudentRepository(prisma);
export const studentService = new StudentService(studentRepository);
export const studentController = new StudentController(studentService);
