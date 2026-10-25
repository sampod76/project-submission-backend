import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);
export const DateToDateGetHours = (
  dateTime1: string | Date,
  dateTime2: string | Date,
): number => {
  const date1: Date = new Date(dateTime1);
  const date2: Date = new Date(dateTime2);

  const diffInMillis: number = Number(date2) - Number(date1);

  const diffInHours: number = diffInMillis / (1000 * 60 * 60);

  return diffInHours;
};

export type IDateFormatType =
  | "dd/mm/yyyy"
  | "mm/dd/yyyy"
  | "yyyy/mm/dd"
  | "dd-mm-yyyy"
  | "mm-dd-yyyy"
  | "yyyy-mm-dd"
  | "dddd, MMMM D, YYYY"
  | "MMM D, YYYY"
  | "D MMM YYYY"
  | "hh:mm A"
  | "HH:mm"
  | "YYYY-MM-DDTHH:mm:ssZ"
  | "unix"
  | "MMM D, YYYY - hh:mm A";

export class DateFormatterDayjsOop {
  public date: string | Date;

  constructor(date: string | Date) {
    this.date = date;
  }

  format(format: IDateFormatType): string {
    const parsedDate = dayjs(this.date);

    const isValidDate = parsedDate.isValid();
    if (!isValidDate) throw new Error("Invalid date format");

    switch (format) {
      case "dd/mm/yyyy":
        return parsedDate.format("DD/MM/YYYY");
      case "mm/dd/yyyy":
        return parsedDate.format("MM/DD/YYYY");
      case "yyyy/mm/dd":
        return parsedDate.format("YYYY/MM/DD");
      case "dd-mm-yyyy":
        return parsedDate.format("DD-MM-YYYY");
      case "mm-dd-yyyy":
        return parsedDate.format("MM-DD-YYYY");
      case "yyyy-mm-dd":
        return parsedDate.format("YYYY-MM-DD");
      case "dddd, MMMM D, YYYY":
        return parsedDate.format("dddd, MMMM D, YYYY");
      case "MMM D, YYYY":
        return parsedDate.format("MMM D, YYYY");
      case "D MMM YYYY":
        return parsedDate.format("D MMM YYYY");
      case "hh:mm A":
        return parsedDate.format("hh:mm A");
      case "HH:mm":
        return parsedDate.format("HH:mm");
      case "YYYY-MM-DDTHH:mm:ssZ":
        return parsedDate.format("YYYY-MM-DDTHH:mm:ssZ");
      case "unix":
        return parsedDate.unix().toString();
      case "MMM D, YYYY - hh:mm A":
        return parsedDate.format("MMM D, YYYY - hh:mm A");
      default:
        throw new Error("Unsupported date format");
    }
  }
  replaceTime(newTime: string) {
    const dateToDayjS = dayjs(this.date).utc();
    const [hours, minutes, second] = newTime.split(":").map(Number);
    const updatedDateTime = dateToDayjS
      .hour(hours)
      .minute(minutes)
      .second(second || 0)
      .millisecond(0);

    return updatedDateTime.toISOString();
  }
}

export const isValidTimeZone = (timeZone: string): boolean => {
  if (!timeZone || typeof timeZone !== "string") return false;

  try {
    Intl.DateTimeFormat("en-US", {
      timeZone: timeZone.trim(),
    }).format();

    return true;
  } catch {
    return false;
  }
};
