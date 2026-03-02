/**
 * API Service Layer
 * Handles all HTTP communication with the backend server
 * 
 * MANUAL SETUP REQUIRED:
 * - Update NEXT_PUBLIC_API_URL in .env.local to match your backend URL
 * - Ensure backend is running on the specified port (default 3001)
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Axios instance with default configuration
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
});

/**
 * Request interceptor - add JWT token to all requests
 */
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    // Check both potential token locations
    const voterToken = localStorage.getItem('access_token');
    const adminToken = Cookies.get('admin_token');

    // Determine which token to use (prioritize admin_token for admin routes)
    const isResourceAdmin = config.url?.includes('/admin') || config.url?.includes('admin/');
    const token = isResourceAdmin ? (adminToken || voterToken) : (voterToken || adminToken);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

/**
 * Response interceptor - handle errors and refresh tokens
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle 401 - token expired or invalid
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        Cookies.remove('admin_token', { path: '/' });

        // Redirect to the correct login page based on current path
        const isPathAdmin = window.location.pathname.startsWith('/h3xG9Lz_admin');
        window.location.href = isPathAdmin ? '/h3xG9Lz_admin' : '/login';
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Response type for API responses
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

/**
 * Error response type
 */
export interface ApiError {
  success: false;
  error: string;
  statusCode?: number;
}

export default apiClient;
