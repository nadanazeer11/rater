import type { ApiError, ApiErrorCode } from '@rater/types';

/** Thrown by the api helpers when the backend returns a non-2xx response.
 *  Carries the uniform `ApiError` fields so callers can branch on `code`. */
export class ApiClientError extends Error {
  readonly statusCode: number;
  readonly code: ApiErrorCode;
  readonly details?: unknown;

  constructor(error: ApiError) {
    super(error.message);
    this.name = 'ApiClientError';
    this.statusCode = error.statusCode;
    this.code = error.code;
    this.details = error.details;
  }
}

export async function toApiClientError(res: Response): Promise<ApiClientError> {
  const body = (await res.json().catch(() => null)) as Partial<ApiError> | null;
  if (body && typeof body.message === 'string' && typeof body.code === 'string') {
    return new ApiClientError(body as ApiError);
  }
  return new ApiClientError({
    statusCode: res.status,
    code: 'INTERNAL',
    message: `Request failed: ${res.status}`,
    timestamp: new Date().toISOString(),
    path: res.url,
  });
}
