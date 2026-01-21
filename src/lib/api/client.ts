import { get } from 'svelte/store';
import { authToken, clearAuthToken } from '$lib/auth';
import type { ApiResponse, ApiResponseBody, ApiResponseBodyKey, ApiResponseBodyValue } from '$lib/types';

const DEFAULT_API_BASE_URL = '/api';

export function getApiBaseUrl(): string {
    return (import.meta.env.PUBLIC_API_BASE_URL as string | undefined) ?? DEFAULT_API_BASE_URL;
}

export class ApiError extends Error {
    status: number;
    payloadText?: string;

    constructor(status: number, message: string, payloadText?: string) {
        super(message);
        this.status = status;
        this.payloadText = payloadText;
    }
}

export function unwrapBody<K extends ApiResponseBodyKey>(
    body: ApiResponseBody,
    key: K
): ApiResponseBodyValue<K> {
    if (key in body) return (body as unknown as Record<K, ApiResponseBodyValue<K>>)[key];
    throw new ApiError(500, 'Unexpected response shape');
}

async function parseJsonResponse(res: Response): Promise<ApiResponse> {
    const text = await res.text();
    try {
        return JSON.parse(text) as ApiResponse;
    } catch {
        throw new ApiError(res.status, 'Failed to parse response', text);
    }
}

export async function apiRequest(
    path: string,
    options: {
        method?: string;
        body?: unknown;
        auth?: boolean;
    } = {}
): Promise<{ res: Response; body?: ApiResponseBody }> {
    const url = `${getApiBaseUrl()}${path}`;
    const token = get(authToken);

    const headers: Record<string, string> = {
        Accept: 'application/json'
    };

    if (options.body !== undefined) {
        headers['Content-Type'] = 'application/json';
    }

    if (options.auth && token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(url, {
        method: options.method ?? 'GET',
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });

    if (res.status === 204) {
        return { res };
    }

    const parsed = await parseJsonResponse(res);
    const body = parsed.body;

    if (res.status === 401 && options.auth) {
        clearAuthToken();
    }

    if (!res.ok) {
        if ('Message' in body) {
            throw new ApiError(res.status, body.Message);
        }
        throw new ApiError(res.status, 'Request failed');
    }

    return { res, body };
}
