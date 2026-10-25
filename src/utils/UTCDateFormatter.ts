import dayjs, { Dayjs } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

export type IUtcInclusiveDateRange = {
  from: Date;
  to: Date;
};

export type IUTCDateFormatterInput = {
  date: string | Date;
  time?: string;
};

export type IUTCDateFormatterOptions = {
  timeZone?: string;
};

export class UTCDateFormatter {
  public readonly date: string | Date;
  public readonly time?: string;
  public readonly timeZone: string;

  private readonly parsedDate: Dayjs;

  private static readonly DEFAULT_TIME_ZONE = "UTC";
  private static readonly TIME_FORMAT = "HH:mm:ss";

  private static readonly SUPPORTED_DATE_ONLY_FORMATS = [
    "YYYY-MM-DD",
    "YYYY/MM/DD",
  ] as const;

  private static readonly SUPPORTED_INPUT_FORMATS = [
    "YYYY-MM-DD",
    "YYYY/MM/DD",

    "YYYY-MM-DD HH:mm",
    "YYYY-MM-DD HH:mm:ss",
    "YYYY-MM-DD HH:mm:ss.S",
    "YYYY-MM-DD HH:mm:ss.SS",
    "YYYY-MM-DD HH:mm:ss.SSS",

    "YYYY/MM/DD HH:mm",
    "YYYY/MM/DD HH:mm:ss",
    "YYYY/MM/DD HH:mm:ss.S",
    "YYYY/MM/DD HH:mm:ss.SS",
    "YYYY/MM/DD HH:mm:ss.SSS",

    "YYYY-MM-DD hh:mm A",
    "YYYY-MM-DD hh:mm:ss A",
    "YYYY-MM-DD hh:mm:ss.S A",
    "YYYY-MM-DD hh:mm:ss.SS A",
    "YYYY-MM-DD hh:mm:ss.SSS A",

    "YYYY/MM/DD hh:mm A",
    "YYYY/MM/DD hh:mm:ss A",
    "YYYY/MM/DD hh:mm:ss.S A",
    "YYYY/MM/DD hh:mm:ss.SS A",
    "YYYY/MM/DD hh:mm:ss.SSS A",

    "YYYY-MM-DDTHH:mm",
    "YYYY-MM-DDTHH:mm:ss",
    "YYYY-MM-DDTHH:mm:ss.S",
    "YYYY-MM-DDTHH:mm:ss.SS",
    "YYYY-MM-DDTHH:mm:ss.SSS",
  ] as const;

  constructor(
    { date, time }: IUTCDateFormatterInput,
    {
      timeZone = UTCDateFormatter.DEFAULT_TIME_ZONE,
    }: IUTCDateFormatterOptions = {},
  ) {
    this.date = date;
    this.time = time?.trim() || undefined;
    this.timeZone = timeZone.trim();

    this.assertValidTimeZone();
    this.assertValidTime();

    this.parsedDate = this.parseInput();
  }

  public formatUtc(): Date {
    return this.parsedDate.utc().toDate();
  }

  public formatUtcISOString(): string {
    return this.parsedDate.utc().toISOString();
  }

  public formatUtcTimestamp(): string {
    return this.parsedDate.utc().format("YYYY-MM-DD HH:mm:ss.SSS");
  }

  public formatLocal(format = "YYYY-MM-DD HH:mm:ss"): string {
    return this.parsedDate.tz(this.timeZone).format(format);
  }

  public formatLocalISOString(): string {
    return this.parsedDate.tz(this.timeZone).format("YYYY-MM-DDTHH:mm:ss.SSSZ");
  }

  public local(): string {
    return this.parsedDate.tz(this.timeZone).toDate().toString();
  }

  public addDaysUtc(days = 1): Date {
    this.assertInteger(days, "days");

    const result = this.addLocalCalendarDays(this.parsedDate, days);

    return result.utc().toDate();
  }

  public addHoursUtc(hours: number): Date {
    this.assertInteger(hours, "hours");

    return this.parsedDate.add(hours, "hour").utc().toDate();
  }

  public addMinutesUtc(minutes: number): Date {
    this.assertInteger(minutes, "minutes");

    return this.parsedDate.add(minutes, "minute").utc().toDate();
  }

  public startOfDayUtc(): Date {
    return this.parsedDate.startOf("day").utc().toDate();
  }

  public endOfDayUtc(): Date {
    return this.parsedDate.endOf("day").utc().toDate();
  }

  public nextDayStartUtc(): Date {
    const localStart = this.parsedDate.startOf("day");
    const nextDayStart = this.addLocalCalendarDays(localStart, 1).startOf(
      "day",
    );

    return nextDayStart.utc().toDate();
  }

  public getUtcDayRange(): IUtcInclusiveDateRange {
    return {
      from: this.parsedDate.startOf("day").utc().toDate(),
      to: this.parsedDate.endOf("day").utc().toDate(),
    };
  }

  public getUtcRangeByDays(days: number): IUtcInclusiveDateRange {
    const hasInvalidDayCount = !Number.isInteger(days) || days < 0;
    if (hasInvalidDayCount)
      throw new TypeError("days must be an integer greater than or equal to 0");

    const localStart = this.parsedDate.startOf("day");
    const localEnd = this.addLocalCalendarDays(localStart, days).endOf("day");

    return {
      from: localStart.utc().toDate(),
      to: localEnd.utc().toDate(),
    };
  }

  public toSqlTimestampWithoutTimeZone(): string {
    const utcDate = this.parsedDate.utc().toDate();

    const timestamp = utcDate.getTime();
    const hasInvalidTimestamp = Number.isNaN(timestamp);
    if (hasInvalidTimestamp)
      throw new TypeError(
        "toSqlTimestampWithoutTimeZone received an invalid Date",
      );

    return utcDate.toISOString().slice(0, 23).replace("T", " ");
  }

  private parseInput(): Dayjs {
    if (this.date instanceof Date) {
      const timestamp = this.date.getTime();
      const hasInvalidTimestamp = Number.isNaN(timestamp);
      if (hasInvalidTimestamp)
        throw new TypeError("Invalid JavaScript Date value");

      if (this.time) {
        const localDate = dayjs(this.date)
          .tz(this.timeZone)
          .format("YYYY-MM-DD");

        return this.parseCombinedDateAndTime(
          localDate,
          "YYYY-MM-DD",
          this.time,
        );
      }

      const parsedDate = dayjs(this.date).tz(this.timeZone);

      this.assertValidDate(parsedDate);

      return parsedDate;
    }

    if (typeof this.date !== "string")
      throw new TypeError("Date value must be a string or JavaScript Date");

    const value = this.date.trim();

    if (!value) throw new TypeError("Date value cannot be empty");

    if (this.time) {
      const dateOnlyFormat = this.detectDateOnlyFormat(value);

      if (!dateOnlyFormat)
        throw new TypeError(
          [
            "Separate time can only be used with a date-only input.",
            'Supported date formats: "YYYY-MM-DD" and "YYYY/MM/DD".',
          ].join(" "),
        );

      return this.parseCombinedDateAndTime(value, dateOnlyFormat, this.time);
    }

    const isUnixTimestampInSeconds = /^\d{10}$/.test(value);
    if (isUnixTimestampInSeconds) {
      const parsedDate = dayjs.unix(Number(value));

      this.assertValidDate(parsedDate);

      return parsedDate.tz(this.timeZone);
    }

    const isUnixTimestampInMilliseconds = /^\d{13}$/.test(value);
    if (isUnixTimestampInMilliseconds) {
      const parsedDate = dayjs(Number(value));

      this.assertValidDate(parsedDate);

      return parsedDate.tz(this.timeZone);
    }

    const includesTimeZoneOffset = this.hasTimeZoneOffset(value);
    if (includesTimeZoneOffset) {
      const parsedDate = dayjs(value);

      this.assertValidDate(parsedDate);

      return parsedDate.tz(this.timeZone);
    }

    const detectedFormat = this.detectInputFormat(value);
    const parsedDate = dayjs.tz(value, detectedFormat, this.timeZone);

    this.assertValidDate(parsedDate);

    return parsedDate;
  }

  private parseCombinedDateAndTime(
    dateValue: string,
    dateFormat: string,
    timeValue: string,
  ): Dayjs {
    const combinedValue = `${dateValue} ${timeValue}`;
    const combinedFormat = `${dateFormat} ${UTCDateFormatter.TIME_FORMAT}`;

    const parsedDate = dayjs.tz(combinedValue, combinedFormat, this.timeZone);

    this.assertValidDate(parsedDate);

    return parsedDate;
  }

  private detectDateOnlyFormat(value: string): string | null {
    for (const format of UTCDateFormatter.SUPPORTED_DATE_ONLY_FORMATS) {
      const parsedDate = dayjs(value, format, true);
      const isValidDate = parsedDate.isValid();
      if (isValidDate) return format;
    }

    return null;
  }

  private detectInputFormat(value: string): string {
    for (const format of UTCDateFormatter.SUPPORTED_INPUT_FORMATS) {
      const parsedDate = dayjs(value, format, true);
      const isValidDate = parsedDate.isValid();
      if (isValidDate) return format;
    }

    throw new TypeError(
      [
        `Unsupported or invalid date value: "${value}".`,
        "Use ISO 8601, Unix timestamp, JavaScript Date,",
        "or one of the supported application date formats.",
      ].join(" "),
    );
  }

  private hasTimeZoneOffset(value: string): boolean {
    return /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  }

  private addLocalCalendarDays(date: Dayjs, days: number): Dayjs {
    const targetLocalDateTime = date
      .tz(this.timeZone)
      .add(days, "day")
      .format("YYYY-MM-DD HH:mm:ss.SSS");

    return dayjs.tz(
      targetLocalDateTime,
      "YYYY-MM-DD HH:mm:ss.SSS",
      this.timeZone,
    );
  }

  private assertValidTime(): void {
    if (!this.time) return;

    const parsedTime = dayjs(this.time, UTCDateFormatter.TIME_FORMAT, true);
    const isValidTime = parsedTime.isValid();
    if (!isValidTime)
      throw new TypeError(
        `Invalid time value: "${this.time}". Expected format: HH:mm:ss`,
      );
  }

  private assertValidTimeZone(): void {
    if (!this.timeZone) throw new TypeError("Timezone cannot be empty");

    try {
      new Intl.DateTimeFormat("en-US", {
        timeZone: this.timeZone,
      }).format();
    } catch {
      throw new TypeError(`Invalid IANA timezone: ${this.timeZone}`);
    }
  }

  private assertInteger(value: number, fieldName: string): void {
    const isInteger = Number.isInteger(value);
    if (!isInteger) throw new TypeError(`${fieldName} must be an integer`);
  }

  private assertValidDate(parsedDate: Dayjs): void {
    const isValidDate = parsedDate.isValid();
    if (!isValidDate)
      throw new TypeError(`Invalid date value: ${String(this.date)}`);
  }
}

export type LocalDateRangeInput = {
  from: string;
  to?: string;
  timeZone: string;
};

export const createUtcDateRange = ({
  from,
  to,
  timeZone,
}: LocalDateRangeInput): { gte: Date; lte: Date } => {
  const fromDate = new UTCDateFormatter({ date: from }, { timeZone });
  const toDate = new UTCDateFormatter({ date: to ?? from }, { timeZone });

  return {
    gte: fromDate.startOfDayUtc(),
    lte: toDate.endOfDayUtc(),
  };
};
