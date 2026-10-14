import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { apiCall, apiRawRequest, ApiError } from './client';
import { authToken, setAuthToken, clearAuthToken } from '$lib/auth';

function jsonResponse(status: number, payload: unknown): Response {
    return new Response(JSON.stringify(payload), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}

beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    clearAuthToken();
});

describe('apiCall', () => {
    it('returns the envelope body', async () => {
        vi.mocked(fetch).mockResolvedValue(jsonResponse(200, { body: { id: 1 } }));
        await expect(apiCall<{ id: number }>('/x', { auth: true })).resolves.toEqual({ id: 1 });
    });

    it('throws ApiError(500) when the body is missing', async () => {
        vi.mocked(fetch).mockResolvedValue(jsonResponse(200, {}));
        await expect(apiCall('/x', { auth: true })).rejects.toMatchObject({
            status: 500,
            message: 'Missing response body'
        });
    });
});

describe('apiRawRequest', () => {
    it('attaches a bearer header when auth is set and a token exists', async () => {
        setAuthToken('tok');
        vi.mocked(fetch).mockResolvedValue(jsonResponse(200, { body: 'ok' }));

        await apiRawRequest('/x', { auth: true });

        const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
        expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    });

    it('clears the auth token on 401 when auth is set', async () => {
        setAuthToken('tok');
        vi.mocked(fetch).mockResolvedValue(jsonResponse(401, { body: 'unauthorized' }));

        await apiRawRequest('/x', { auth: true });

        expect(get(authToken)).toBeNull();
    });

    it('performs a single attempt — no retry on empty 500 or fetch exception', async () => {
        vi.mocked(fetch).mockResolvedValue(new Response('', { status: 500 }));
        await apiRawRequest('/x', { auth: true });
        expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);

        vi.mocked(fetch).mockRejectedValue(new TypeError('net down'));
        await expect(apiRawRequest('/x', { auth: true })).rejects.toBeInstanceOf(TypeError);
        expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
    });

    it('returns parsed undefined on a non-JSON body and keeps the raw text', async () => {
        vi.mocked(fetch).mockResolvedValue(
            new Response('not json', { status: 200 })
        );
        const { text, parsed } = await apiRawRequest('/x', { auth: true });
        expect(text).toBe('not json');
        expect(parsed).toBeUndefined();
    });
});
