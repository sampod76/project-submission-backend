import fs from "fs";
import path from "path";

export function createDirectories(baseDir?: string, folders?: string[]): void {
  const defaultBaseDir: string = path.join(__dirname, "../../../uploadFile");
  const defaultFolders: string[] = [
    "images",
    "audios",
    "pdfs",
    "videos",
    "docs",
    "others",
  ];
  const finalBaseDir = baseDir
    ? path.join(__dirname, baseDir as string)
    : defaultBaseDir;
  const finalFolders = folders || defaultFolders;

  const baseDirectoryExists = fs.existsSync(finalBaseDir);
  if (!baseDirectoryExists) {
    fs.mkdirSync(finalBaseDir);
    console.log(`Created base directory: ${finalBaseDir}`);
  }
  const backupDir = path.join(__dirname, "../../../backupdb");
  const backupDirectoryExists = fs.existsSync(backupDir);
  if (!backupDirectoryExists) {
    fs.mkdirSync(backupDir);
    console.log(`Created base directory: ${backupDir}`);
  }
  finalFolders.forEach(folder => {
    const folderPath = path.join(finalBaseDir, folder);
    const folderExists = fs.existsSync(folderPath);
    if (!folderExists) {
      fs.mkdirSync(folderPath);
      console.log(`Created folder: ${folderPath}`.green);
    } else console.log(`Folder already exists: ${folderPath}`.red);
  });
}
