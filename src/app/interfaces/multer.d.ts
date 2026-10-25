import { Request, RequestHandler } from "express";
import { Readable } from "stream";

declare global {
  namespace Express {
    namespace Multer {
      interface File {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        stream: Readable;
        destination: string;
        filename: string;
        path: string;
        buffer: Buffer;
      }
    }

    interface Request {
      file?: Multer.File | undefined;
      files?:
        | {
            [fieldname: string]: Multer.File[];
          }
        | Multer.File[]
        | undefined;
    }
  }
}

declare function multer(options?: multer.Options): multer.Multer;

declare namespace multer {
  interface Multer {
    single(fieldName: string): RequestHandler;
    array(fieldName: string, maxCount?: number): RequestHandler;
    fields(fields: ReadonlyArray<Field>): RequestHandler;
    any(): RequestHandler;
    none(): RequestHandler;
  }

  function diskStorage(options: DiskStorageOptions): StorageEngine;
  function memoryStorage(): StorageEngine;

  type ErrorCode =
    | "LIMIT_PART_COUNT"
    | "LIMIT_FILE_SIZE"
    | "LIMIT_FILE_COUNT"
    | "LIMIT_FIELD_KEY"
    | "LIMIT_FIELD_VALUE"
    | "LIMIT_FIELD_COUNT"
    | "LIMIT_UNEXPECTED_FILE";

  class MulterError extends Error {
    constructor(code: ErrorCode, field?: string);
    name: string;
    code: ErrorCode;
    message: string;
    field?: string | undefined;
  }

  interface FileFilterCallback {
    (error: Error): void;
    (error: null, acceptFile: boolean): void;
  }

  interface Options {
    storage?: StorageEngine | undefined;
    dest?: string | undefined;
    limits?:
      | {
          fieldNameSize?: number | undefined;
          fieldSize?: number | undefined;
          fields?: number | undefined;
          fileSize?: number | undefined;
          files?: number | undefined;
          parts?: number | undefined;
          headerPairs?: number | undefined;
        }
      | undefined;
    preservePath?: boolean | undefined;
    fileFilter?(
      req: Request,
      file: Express.Multer.File,
      callback: FileFilterCallback,
    ): void;
  }

  interface StorageEngine {
    _handleFile(
      req: Request,
      file: Express.Multer.File,
      callback: (error?: any, info?: Partial<Express.Multer.File>) => void,
    ): void;
    _removeFile(
      req: Request,
      file: Express.Multer.File,
      callback: (error: Error | null) => void,
    ): void;
  }

  interface DiskStorageOptions {
    destination?:
      | string
      | ((
          req: Request,
          file: Express.Multer.File,
          callback: (error: Error | null, destination: string) => void,
        ) => void)
      | undefined;
    filename?(
      req: Request,
      file: Express.Multer.File,
      callback: (error: Error | null, filename: string) => void,
    ): void;
  }

  interface Field {
    name: string;
    maxCount?: number | undefined;
  }
}

export = multer;
