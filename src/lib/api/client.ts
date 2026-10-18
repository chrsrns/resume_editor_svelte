import { get } from 'svelte/store';
import { authToken, clearAuthToken } from '$lib/auth';
import { clearCurrentUser } from '$lib/session';
import type { ApiResponse } from '$lib/types';

const DEFAULT_API_BASE_URL = '/api';

export function getApiBaseUrl(): string {
    return (import.meta.env.VITE_PUBLIC_API_BASE_URL as string | undefined) ?? DEFAULT_API_BASE_URL;
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

/**
 * Error message precedence: an envelope `body` string renders verbatim, else the
 * Rocket default catcher's `reason` and `description`, else the caller's
 * fallback. Rocket content-negotiates on `Accept`, and every request here asks
 * for JSON, so a framework-level rejection arrives as `{error:{…}}` with no
 * `body` key at all.
 */
export function apiErrorMessage(payload: unknown, fallback: string): string {
    if (payload === null || typeof payload !== 'object') return fallback;

    const { body, error } = payload as { body?: unknown; error?: unknown };

    if (typeof body === 'string') return body;

    if (error !== null && typeof error === 'object') {
        const { reason, description } = error as { reason?: unknown; description?: unknown };
        const parts = [reason, description].filter(
            (part): part is string => typeof part === 'string' && part.length > 0
        );
        if (parts.length > 0) return parts.join(': ');
    }

    return fallback;
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
    function wait(delay: number) {
        return new Promise((resolve) => setTimeout(resolve, delay));
    }

    async function fetchRetry(
        url: string,
        initDelay: number,
        tries: number,
        fetchOptions = {}
    ): Promise<Response> {
        const delayMultiplier = 2;
        let currentDelay = initDelay;
        let triesLeft = tries;

        while (triesLeft > 0) {
            const res = await fetch(url, fetchOptions).catch(async (e) => {
                console.log('Retrying from exception: ', e);
                triesLeft--;
                if (triesLeft === 0) {
                    throw new ApiError(500, 'Failed to fetch');
                }
                await wait(currentDelay);
                currentDelay *= delayMultiplier;
                return null;
            });

            if (res === null) {
                continue;
            }

            if (res.status === 500) {
                const bodyText = await res.clone().text();
                if (bodyText.trim().length === 0) {
                    console.log('Retrying from 500 error');
                    triesLeft--;
                    if (triesLeft === 0) {
                        throw new ApiError(500, 'Failed to fetch');
                    }
                    await wait(currentDelay);
                    currentDelay *= delayMultiplier;
                    continue;
                }
            }
            return res;
        }
        throw new ApiError(500, 'Failed to fetch');
    }

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

    const res = await fetchRetry(url, 50, 3, {
        method: options.method ?? 'GET',
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body)
    }).catch((error) => {
        console.log('Failed to fetch: ', error);
        throw error;
    });

    if (res.status === 204) {
        return { res };
    }

    const parsed = await parseJsonResponse<T>(res);
    const body = parsed.body;

    if (res.status === 401 && options.auth) {
        clearAuthToken();
        clearCurrentUser();
    }

    if (!res.ok) {
        throw new ApiError(res.status, apiErrorMessage(parsed, 'Request failed'));
    }

    return { res, body };
}

export type ApiRequestOptions = {
    method?: string;
    body?: unknown;
    auth?: boolean;
};

/**
 * Envelope-JSON request returning the parsed body directly.
 * Throws ApiError(500, 'Missing response body') when the envelope has no body.
 */
export async function apiCall<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    const { body } = await apiRequest<T>(path, options);
    if (body === undefined) throw new ApiError(500, 'Missing response body');
    return body;
}

export type ApiRawRequestOptions = {
    method?: string;
    contentType?: string;
    rawBody?: string;
    auth?: boolean;
};

/**
 * Raw-transport request for non-JSON payloads (e.g. text/markdown).
 * Single attempt — no retry. Fetch exceptions propagate raw.
 * Returns the response plus eagerly-read text and a best-effort parsed
 * envelope (`undefined` when the body is not JSON).
 */
export async function apiRawRequest(
    path: string,
    options: ApiRawRequestOptions = {}
): Promise<{ res: Response; text: string; parsed: { body?: unknown } | undefined }> {
    const url = `${getApiBaseUrl()}${path}`;
    const token = get(authToken);

    const headers: Record<string, string> = {};
    if (options.contentType) {
        headers['Content-Type'] = options.contentType;
    }
    if (options.auth && token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url, {
        method: options.method ?? 'GET',
        headers,
        body: options.rawBody
    });

    if (res.status === 401 && options.auth) {
        clearAuthToken();
        clearCurrentUser();
    }

    const text = await res.text();
    let parsed: { body?: unknown } | undefined;
    try {
        parsed = JSON.parse(text) as { body?: unknown };
    } catch {
        parsed = undefined;
    }

    return { res, text, parsed };
}
