/**
 * A lightweight HTTP client using native fetch.
 * Provides methods for GET, POST, and JSON handling.
 */
export class APIClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseUrl: string, headers?: Record<string, string>) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...headers,
    };
  }

  /**
   * Perform a GET request.
   */
  async get<T = any>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(endpoint, this.baseUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.defaultHeaders,
    });
    return this.handleResponse<T>(response);
  }

  /**
   * Perform a POST request.
   */
  async post<T = any>(endpoint: string, body?: any): Promise<T> {
    const url = new URL(endpoint, this.baseUrl);
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: this.defaultHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    // If response is empty (204), return null
    if (response.status === 204) {
      return null as T;
    }
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json() as T;
    } else {
      // Return raw text if not JSON
      return await response.text() as any as T;
    }
  }
}