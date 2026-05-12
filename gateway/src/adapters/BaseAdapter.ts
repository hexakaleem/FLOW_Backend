import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { config } from '../config';

type HttpError = {
  response?: {
    data: unknown;
  };
};

export abstract class BaseAdapter {
  protected http: AxiosInstance;

  constructor(baseURL: string) {
    this.http = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'X-Internal-Key': config.internalApiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  protected async get<T = unknown>(path: string, params?: Record<string, unknown>): Promise<T> {
    try {
      const response = await this.http.get<{ data: T }>(path, { params });
      return response.data.data;
    } catch (error: unknown) {
      throw this.unwrapError(error);
    }
  }

  protected async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    try {
      const response = await this.http.post<{ data: T }>(path, body);
      return response.data.data;
    } catch (error: unknown) {
      throw this.unwrapError(error);
    }
  }

  protected async patch<T = unknown>(path: string, body?: unknown): Promise<T> {
    try {
      const response = await this.http.patch<{ data: T }>(path, body);
      return response.data.data;
    } catch (error: unknown) {
      throw this.unwrapError(error);
    }
  }

  protected async delete<T = unknown>(path: string): Promise<T> {
    try {
      const response = await this.http.delete<{ data: T }>(path);
      return response.data.data;
    } catch (error: unknown) {
      throw this.unwrapError(error);
    }
  }

  private unwrapError(error: unknown): unknown {
    const httpError = error as HttpError;
    if (httpError.response?.data) {
      return httpError.response.data;
    }
    return error;
  }
}
