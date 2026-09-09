import { API_BASE_URL } from '../../constants';

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  source: 'backend' | 'local_fallback';
}

class ApiClient {
  private baseUrl: string;
  private isBackendAvailable: boolean = true;
  private lastHealthCheck: number = 0;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  public setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/$/, '');
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public async request<T>(
    endpoint: string,
    options: RequestInit = {},
    fallbackFn?: () => T
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}/${endpoint.replace(/^\//, '')}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(options.headers || {})
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      this.isBackendAvailable = true;
      return {
        data,
        success: true,
        source: 'backend'
      };
    } catch (error) {
      // Graceful offline fallback to trafficStore / local data
      if (fallbackFn) {
        const localData = fallbackFn();
        return {
          data: localData,
          success: true,
          message: 'Backend currently offline. Serving from local store.',
          source: 'local_fallback'
        };
      }
      throw error;
    }
  }

  public async get<T>(endpoint: string, fallbackFn?: () => T): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' }, fallbackFn);
  }

  public async post<T>(endpoint: string, body: any, fallbackFn?: () => T): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }, fallbackFn);
  }

  public async put<T>(endpoint: string, body: any, fallbackFn?: () => T): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }, fallbackFn);
  }

  public async delete<T>(endpoint: string, fallbackFn?: () => T): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' }, fallbackFn);
  }
}

export const apiClient = new ApiClient();
