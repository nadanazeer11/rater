export * from './api';

export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'VALIDATION_FAILED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UNPROCESSABLE'
  | 'INTERNAL';

export interface ApiError {
  statusCode: number;
  code: ApiErrorCode;
  message: string;
  details?: unknown;
  timestamp: string;
  path: string;
}
