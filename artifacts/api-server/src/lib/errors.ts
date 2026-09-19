/**
 * Application Error Definitions
 *
 * Provides standardized, typed error instances for consistent
 * status codes and error payloads across all endpoints.
 */

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly fields?: Record<string, unknown>;

  constructor(
    statusCode: number,
    code: ErrorCode,
    message: string,
    fields?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.fields = fields;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static badRequest(message = "Invalid request", fields?: Record<string, unknown>): AppError {
    return new AppError(400, "VALIDATION_ERROR", message, fields);
  }

  static unauthorized(message = "Authentication required"): AppError {
    return new AppError(401, "UNAUTHORIZED", message);
  }

  static forbidden(message = "Access denied"): AppError {
    return new AppError(403, "FORBIDDEN", message);
  }

  static notFound(message = "Resource not found"): AppError {
    return new AppError(404, "NOT_FOUND", message);
  }

  static conflict(message = "Resource conflict"): AppError {
    return new AppError(409, "CONFLICT", message);
  }

  static rateLimited(message = "Too many requests. Please try again later."): AppError {
    return new AppError(429, "RATE_LIMITED", message);
  }

  static internal(message = "An unexpected error occurred"): AppError {
    return new AppError(500, "INTERNAL_ERROR", message);
  }
}
