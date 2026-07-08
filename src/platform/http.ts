import axios from 'axios';

import { PLATFORM_API_BASE_URL } from './config';
import { getPlatformSessionToken } from './storage';

export interface PlatformHttpError extends Error {
  code?: string;
  statusCode?: number;
  responseData?: unknown;
}

export const platformHttp = axios.create({
  baseURL: PLATFORM_API_BASE_URL,
  timeout: 15000,
});

platformHttp.interceptors.request.use((config) => {
  const sessionToken = getPlatformSessionToken();
  if (sessionToken) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${sessionToken}`;
  }
  return config;
});

platformHttp.interceptors.response.use(
  (response) => response.data?.data ?? response.data,
  (error) => {
    const platformError = new Error(
      error?.response?.data?.error?.message || error?.message || 'platform request failed'
    ) as PlatformHttpError;
    platformError.code = error?.response?.data?.error?.code || 'PLATFORM_REQUEST_FAILED';
    platformError.statusCode = Number(error?.response?.status || 0);
    platformError.responseData = error?.response?.data || null;
    return Promise.reject(platformError);
  }
);
