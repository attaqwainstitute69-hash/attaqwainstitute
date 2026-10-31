import { errorMessages, type ErrorCode } from "./errorMessages";

// Expected business error. Services throw it; errorHandler turns it into the envelope (backend.md §3.1).
export class AppError extends Error {
  isOperational = true;

  constructor(
    public readonly code: ErrorCode,
    public readonly statusCode: number,
    public readonly details?: unknown,
    message?: string,
  ) {
    super(message ?? errorMessages.bn[code]);
    this.name = "AppError";
  }
}
