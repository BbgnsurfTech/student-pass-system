import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import * as SecureStore from 'expo-secure-store';
import NetInfo from '@react-native-community/netinfo';
import { store } from '../store/store';
import { refreshToken, logout } from '../store/slices/authSlice';

// API Configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
const API_TIMEOUT = 10000; // 10 seconds

class ApiClient {
  private instance: AxiosInstance;
  private requestQueue: Array<() => Promise<any>> = [];
  private isRefreshing = false;

  constructor() {
    this.instance = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.instance.interceptors.request.use(
      async (config) => {
        // Check network connectivity
        const netInfo = await NetInfo.fetch();
        if (!netInfo.isConnected) {
          throw new Error('No internet connection');
        }

        // Add auth token
        const token = await SecureStore.getItemAsync('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add device info
        config.headers['X-Device-Type'] = 'mobile';
        config.headers['X-App-Version'] = process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0';

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Handle token expiration
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // Queue the request
            return new Promise((resolve, reject) => {
              this.requestQueue.push(async () => {
                try {
                  const token = await SecureStore.getItemAsync('accessToken');
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                  resolve(this.instance(originalRequest));
                } catch (err) {
                  reject(err);
                }
              });
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            await store.dispatch(refreshToken()).unwrap();
            
            // Retry queued requests
            this.requestQueue.forEach(callback => callback());
            this.requestQueue = [];

            // Retry original request
            const token = await SecureStore.getItemAsync('accessToken');
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return this.instance(originalRequest);
          } catch (refreshError) {
            // Refresh failed, logout user
            this.requestQueue = [];
            store.dispatch(logout());
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        // Handle network errors
        if (!error.response) {
          error.message = 'Network error. Please check your connection.';
        }

        return Promise.reject(error);
      }
    );
  }

  // HTTP Methods
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.get<T>(url, config);
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.post<T>(url, data, config);
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.put<T>(url, data, config);
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.patch<T>(url, data, config);
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.delete<T>(url, config);
  }

  // File upload with progress
  async uploadFile(
    url: string,
    formData: FormData,
    onProgress?: (progress: number) => void
  ): Promise<AxiosResponse> {
    return this.instance.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const progress = (progressEvent.loaded / progressEvent.total) * 100;
          onProgress(Math.round(progress));
        }
      },
    });
  }

  // Download file
  async downloadFile(url: string, onProgress?: (progress: number) => void): Promise<AxiosResponse> {
    return this.instance.get(url, {
      responseType: 'blob',
      onDownloadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const progress = (progressEvent.loaded / progressEvent.total) * 100;
          onProgress(Math.round(progress));
        }
      },
    });
  }

  // Cancel all pending requests
  cancelAllRequests() {
    // Implementation depends on your needs
    // You might want to store cancel tokens and cancel them here
  }
}

// Create and export the API client instance
export const apiClient = new ApiClient();

// Export types for TypeScript
export type { AxiosResponse, AxiosRequestConfig };