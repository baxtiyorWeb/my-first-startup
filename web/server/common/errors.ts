export type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "BAD_REQUEST"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export interface ValidationErrorDetail {
  field: string;
  issue: string;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: ValidationErrorDetail[];

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 400,
    details?: ValidationErrorDetail[]
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static unauthorized(message = "Tizimga kirish talab qilinadi"): AppError {
    return new AppError("UNAUTHORIZED", message, 401);
  }

  static forbidden(message = "Ushbu amalni bajarishga ruxsatingiz yo‘q"): AppError {
    return new AppError("FORBIDDEN", message, 403);
  }

  static notFound(message = "So‘ralgan ma’lumot topilmadi"): AppError {
    return new AppError("NOT_FOUND", message, 404);
  }

  static validation(message: string, details?: ValidationErrorDetail[]): AppError {
    return new AppError("VALIDATION_ERROR", message, 400, details);
  }

  static badRequest(message: string): AppError {
    return new AppError("BAD_REQUEST", message, 400);
  }

  static conflict(message: string): AppError {
    return new AppError("CONFLICT", message, 409);
  }

  static rateLimited(message = "Juda ko‘p so‘rov yuborildi. Iltimos, birozdan so‘ng urinib ko‘ring"): AppError {
    return new AppError("RATE_LIMITED", message, 429);
  }

  static internal(message = "Serverda kutilmagan xatolik yuz berdi"): AppError {
    return new AppError("INTERNAL_ERROR", message, 500);
  }
}
