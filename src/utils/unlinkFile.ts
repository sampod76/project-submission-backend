import fs from "fs";
import { errorLogger } from "../app/share/logger";

export const unlinkFile = (path: string) => {
  if (path)
    fs.stat(path, (err, stats) => {
      if (err)
        if (err.code === "ENOENT") errorLogger.error("File not found");
        else errorLogger.error(`Error checking file existence: ${err.message}`);
      else
        fs.unlink(path, (error: any) => {
          if (error) errorLogger.error(`Error deleting file: ${error.message}`);
        });
    });
};
