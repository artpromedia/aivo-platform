/**
 * Axios type declarations
 * Local declarations for axios module
 */

declare module 'axios' {
  export interface AxiosRequestConfig {
    url?: string;
    method?: string;
    baseURL?: string;
    headers?: Record<string, string>;
    params?: Record<string, unknown>;
    data?: unknown;
    timeout?: number;
    auth?: {
      username: string;
      password: string;
    };
    responseType?: string;
    [key: string]: unknown;
  }

  export interface AxiosResponse<T = unknown> {
    data: T;
    status: number;
    statusText: string;
    headers: Record<string, string>;
    config: AxiosRequestConfig;
  }

  export interface AxiosError<T = unknown> extends Error {
    config: AxiosRequestConfig;
    code?: string;
    request?: unknown;
    response?: AxiosResponse<T>;
    isAxiosError: boolean;
  }

  export interface AxiosInstance {
    request<T = unknown>(config: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    head<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    patch<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    defaults: AxiosRequestConfig;
    interceptors: {
      request: {
        use(
          onFulfilled?: (config: AxiosRequestConfig) => AxiosRequestConfig | Promise<AxiosRequestConfig>,
          onRejected?: (error: unknown) => unknown
        ): number;
        eject(id: number): void;
      };
      response: {
        use(
          onFulfilled?: (response: AxiosResponse) => AxiosResponse | Promise<AxiosResponse>,
          onRejected?: (error: unknown) => unknown
        ): number;
        eject(id: number): void;
      };
    };
  }

  export interface AxiosStatic extends AxiosInstance {
    create(config?: AxiosRequestConfig): AxiosInstance;
    isAxiosError(payload: unknown): payload is AxiosError;
  }

  const axios: AxiosStatic;
  export default axios;
}
