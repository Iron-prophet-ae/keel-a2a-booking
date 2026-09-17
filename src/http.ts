import type { Context } from "hono";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function jsonError(
  c: Context,
  status: number,
  code: string,
  message: string,
) {
  return c.json({ error: { code, message } }, status as 400);
}
