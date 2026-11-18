import { NextResponse } from "next/server";
import { AppError } from "./errors";

export interface ApiResponseSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiResponseError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function successResponse<T>(data: T, meta?: Record<string, unknown>, status = 200) {
  const body: ApiResponseSuccess<T> = {
    success: true,
    data,
    ...(meta ? { meta } : {}),
  };
  return NextResponse.json(body, { status });
}

export function errorResponse(error: unknown) {
  if (error instanceof AppError) {
    const body: ApiResponseError = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    };
    return NextResponse.json(body, { status: error.statusCode });
  }

  // Handle unhandled exceptions without leaking internal secrets
  console.error("[Unhandled Exception]:", error);
  const fallback: ApiResponseError = {
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "Serverda kutilmagan xatolik yuz berdi. Iltimos, keyinroq urinib ko‘ring.",
    },
  };
  return NextResponse.json(fallback, { status: 500 });
}
