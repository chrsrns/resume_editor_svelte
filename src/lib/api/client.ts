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
        if (typeof body === 'string') {
            throw new ApiError(res.status, body);
        }

        throw new ApiError(res.status, 'Request failed');
    }

    return { res, body };
}
