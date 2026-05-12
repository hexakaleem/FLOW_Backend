export interface PaginatedResult<T> {
  data: T[];
  meta: {
    cursor?: string;
    total: number;
    hasMore: boolean;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
    cursor?: string;
    total?: number;
    hasMore?: boolean;
  };
}
