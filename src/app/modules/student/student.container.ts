import { StudentService } from "./student.service";
import { studentRepository } from "./student.repository";
import { StudentController } from "./student.controller";
import { StudentRoutes } from "./student.route";
export const studentService = new StudentService(studentRepository);
export const studentController = new StudentController(studentService);
export const studentRoutes = new StudentRoutes(studentController);
