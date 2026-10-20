/** An error with an HTTP status and a stable code; the error middleware turns it into { error: { code, message } }. */
export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const notFound = (what: string) => new HttpError(404, "not_found", `${what} was not found.`);
