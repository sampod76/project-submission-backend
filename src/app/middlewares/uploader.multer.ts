import { Request } from "express";

import multer, { FileFilterCallback, StorageEngine } from "multer";
import path from "path";

const uploadFilePath = "../../../../uploadFile";
const storage: StorageEngine = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, `${uploadFilePath}/images/`));
  },
  filename: (
    req,
    file: { originalname: string },
    cb: (arg0: null, arg1: string) => any,
  ) => {
    const fileExt = path.extname(file.originalname);
    const sanitizedFileName = file.originalname
      .replace(fileExt, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .trim();

    const fileName = `${sanitizedFileName}-${Date.now()}${fileExt}`;
    cb(null, fileName);
  },
});

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
) => {
  const allowedMimeTypes = [
    "image/jpg",
    "image/png",
    "image/jpeg",
    "image/heic",
    "image/heif",
    "image/gif",
    "image/avif",
  ];
  if (allowedMimeTypes.includes(file.mimetype)) cb(null, true);
  else
    cb(
      new Error(
        "Only jpg, jpeg, png, heic, heif, gif, avif formats are allowed!",
      ),
    );
};

export const uploadImage = multer({
  storage: storage,
  limits: {
    fileSize: 30 * 1024 * 1024,
  },
  fileFilter,
});

const videoStorage: StorageEngine = multer.diskStorage({
  destination: (req: any, file: any, cb: (arg0: null, arg1: string) => any) => {
    cb(null, path.join(__dirname, `${uploadFilePath}/videos/`));
  },
  filename: (
    req: any,
    file: { originalname: string },
    cb: (arg0: null, arg1: string) => any,
  ) => {
    const fileExt = path.extname(file.originalname);
    const sanitizedFileName = file.originalname
      .replace(fileExt, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .trim();

    const fileName = `${sanitizedFileName}-${Date.now()}${fileExt}`;
    cb(null, fileName);
  },
});

const fileFilterVideo = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
) => {
  if (file.mimetype.includes("video")) cb(null, true);
  else cb(new Error("Only mp4 format is allowed!"));
};

export const uploadVideoFile: any = multer({
  storage: videoStorage,
  limits: {
    fileSize: 200 * 1024 * 1024,
  },
  fileFilter: fileFilterVideo,
});

const pdfStorage: StorageEngine = multer.diskStorage({
  destination: (req: any, file: any, cb: (arg0: null, arg1: string) => any) => {
    cb(null, path.join(__dirname, `${uploadFilePath}/pdfs/`));
  },
  filename: (
    req: any,
    file: { originalname: string },
    cb: (arg0: null, arg1: string) => any,
  ) => {
    const fileExt = path.extname(file.originalname);
    const sanitizedFileName = file.originalname
      .replace(fileExt, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .trim();

    const fileName = `${sanitizedFileName}-${Date.now()}${fileExt}`;
    cb(null, fileName);
  },
});

const fileFilterPdf = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
) => {
  if (file.mimetype === "file/pdf" || file.mimetype === "application/pdf")
    cb(null, true);
  else cb(new Error("Only pdf format is allowed!"));
};

export const uploadPdfFile: any = multer({
  storage: pdfStorage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: fileFilterPdf,
});

const audioStorage: StorageEngine = multer.diskStorage({
  destination: (req: any, file: any, cb: (arg0: null, arg1: string) => any) => {
    cb(null, path.join(__dirname, `${uploadFilePath}/audios/`));
  },
  filename: (
    req: any,
    file: { originalname: string },
    cb: (arg0: null, arg1: string) => any,
  ) => {
    const fileExt = path.extname(file.originalname);
    const sanitizedFileName = file.originalname
      .replace(fileExt, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .trim();

    const fileName = `${sanitizedFileName}-${Date.now()}${fileExt}`;
    cb(null, fileName);
  },
});

const fileFilterAudio = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
) => {
  if (file.mimetype === "file/mpeg" || file.mimetype === "audio/mpeg")
    cb(null, true);
  else cb(new Error("Only audio format is allowed!"));
};

export const uploadAudioFile: any = multer({
  storage: audioStorage,
  limits: {
    fileSize: 30 * 1024 * 1024,
  },
  fileFilter: fileFilterAudio,
});

const fileStorage: StorageEngine = multer.diskStorage({
  destination: (
    req: any,
    file: any,
    cb: (error: Error | null, destination: string) => void,
  ) => {
    let destinationPath;
    if (file.mimetype.includes("image"))
      destinationPath = path.join(__dirname, `${uploadFilePath}/images/`);
    else if (file.mimetype.includes("pdf"))
      destinationPath = path.join(__dirname, `${uploadFilePath}/pdfs/`);
    else if (file.mimetype.includes("application"))
      destinationPath = path.join(__dirname, `${uploadFilePath}/docs/`);
    else if (file.mimetype.includes("video"))
      destinationPath = path.join(__dirname, `${uploadFilePath}/videos/`);
    else if (file.mimetype.includes("audio"))
      destinationPath = path.join(__dirname, `${uploadFilePath}/audios/`);
    else destinationPath = path.join(__dirname, `${uploadFilePath}/others/`);

    cb(null, destinationPath);
  },
  filename: (
    req: any,
    file: { originalname: string },
    cb: (error: Error | null, filename: string) => void,
  ) => {
    const fileExt = path.extname(file.originalname);
    const sanitizedFileName = file.originalname
      .replace(fileExt, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .trim();

    const fileName = `${sanitizedFileName}-${Date.now()}${fileExt}`;
    cb(null, fileName);
  },
});

const fileFilterFun = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
) => {
  const allowedMimeTypes = [
    "application/pdf",
    "application/x-x509-ca-cert",
    "application/octet-stream",
    "application/pkix-cert",
    "application/pkcs8",
    "application/msword",
  ];

  const isAllowedMimeType =
    allowedMimeTypes.includes(file.mimetype) || file.mimetype.includes("image");
  if (isAllowedMimeType) cb(null, true);
  else
    cb(
      new Error(
        "Only " +
          allowedMimeTypes.map(type => type.split("/")[1]).join(", ") +
          "format is allowed!",
      ),
    );
};

export const uploadFile = multer({
  storage: fileStorage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: fileFilterFun,
});
