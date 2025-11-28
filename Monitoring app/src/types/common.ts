export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface ActivityData {
  employeeId: number;
  timestamp: string;
  applicationName: string;
  windowTitle: string;
  isActive: boolean;
}