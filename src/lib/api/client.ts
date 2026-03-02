import { get } from 'svelte/store';
import { authToken, clearAuthToken } from '$lib/auth';
import type { ApiResponse } from '$lib/types';

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

async function parseJsonResponse<T>(res: Response): Promise<ApiResponse<T>> {
    const text = await res.text();
    try {
        return JSON.parse(text) as ApiResponse<T>;
    } catch {
        throw new ApiError(res.status, 'Failed to parse response', text);
    }
}

export async function apiRequest<T = unknown>(
    path: string,
    options: {
        method?: string;
        body?: unknown;
        auth?: boolean;
    } = {}
): Promise<{ res: Response; body?: T }> {
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

    const parsed = await parseJsonResponse<T>(res);
    const body = parsed.body;

    if (res.status === 401 && options.auth) {
        clearAuthToken();
    }

    if (!res.ok) {
        if (typeof body === 'string') {
            throw new ApiError(res.status, body);
        }

        throw new ApiError(res.status, 'Request failed');
    }

    return { res, body };
}
