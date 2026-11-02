import { supabase } from './supabaseClient';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number>;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<{ data: T | null; error: string | null; status: number }> {
  try {
    // 1. Get active user access token
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    // 2. Build headers
    const headers = new Headers(options.headers || {});
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    // 3. Build URL with query params
    let url = `${API_BASE_URL}${endpoint}`;
    if (options.params) {
      const searchParams = new URLSearchParams();
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      url += `?${searchParams.toString()}`;
    }

    // 4. Execute fetch
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const status = response.status;
    let resJson: any = null;

    try {
      resJson = await response.json();
    } catch {
      // response might not be json
    }

    if (!response.ok) {
      const errorMessage = resJson?.message || `Request failed with status ${status}`;
      return { data: null, error: errorMessage, status };
    }

    return { data: resJson?.data !== undefined ? resJson.data : resJson, error: null, status };
  } catch (err: any) {
    console.error(`API Error [${endpoint}]:`, err);
    return { data: null, error: err.message || 'Network request failed', status: 500 };
  }
}

export const api = {
  get: <T = any>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),
  post: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T = any>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};

