export class CalendarCredentialsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CalendarCredentialsError";
  }
}
