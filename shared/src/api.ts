export type ApiResponse<T> =
  { data: T; error: null } | { data: null; error: ApiError };

export type ErrorCode =
  | 'invalid_body'
  | 'invalid_name'
  | 'invalid_deck'
  | 'invalid_card'
  | 'unauthorized'
  | 'not_found'
  | 'stale_round'
  | 'payload_too_large';

export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: unknown;
}
