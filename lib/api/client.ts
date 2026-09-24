export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    total?: number;
    cursor?: string | null;
    hasMore?: boolean;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(message: string, code: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiSuccessResponse<T>> {
  const { headers, ...customConfig } = options;

  const config: RequestInit = {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    credentials: "include", // Ensure HttpOnly JWT cookie is sent
    ...customConfig,
  };

  const url = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  let response: Response;
  try {
    response = await fetch(url, config);
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw err;
    }
    throw new ApiError(
      "Serverga ulanishda xatolik yuz berdi. Internet aloqasini tekshiring.",
      "NETWORK_ERROR",
      0
    );
  }

  const json = await response.json().catch(() => null);

  if (!response.ok || !json?.success) {
    const message =
      json?.error?.message ||
      (response.status === 401
        ? "Avtorizatsiyadan o‘tilmagan"
        : response.status === 403
        ? "Ushbu amalni bajarishga ruxsat yo‘q"
        : response.status === 404
        ? "Ma’lumot topilmadi"
        : response.status === 429
        ? "So‘rovlar soni me’yordan oshdi. Biroz kuting."
        : "Noma’lum xatolik yuz berdi");

    throw new ApiError(
      message,
      json?.error?.code || "UNKNOWN_ERROR",
      response.status,
      json?.error?.details
    );
  }

  return json as ApiSuccessResponse<T>;
}
