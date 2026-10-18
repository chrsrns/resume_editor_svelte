import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { apiCall, apiRawRequest, apiErrorMessage, ApiError } from './client';
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
        vi.mocked(fetch).mockResolvedValue(new Response('not json', { status: 200 }));
        const { text, parsed } = await apiRawRequest('/x', { auth: true });
        expect(text).toBe('not json');
        expect(parsed).toBeUndefined();
    });
});

describe('apiErrorMessage', () => {
    const catcher = {
        error: {
            code: 401,
            reason: 'Unauthorized',
            description: 'The request requires user authentication.'
        }
    };

    it('renders a string envelope body verbatim', () => {
        expect(apiErrorMessage({ body: 'Unauthorized' }, 'Request failed')).toBe('Unauthorized');
    });

    it('prefers a string body over the catcher fields', () => {
        expect(apiErrorMessage({ body: 'verbatim', ...catcher }, 'Request failed')).toBe(
            'verbatim'
        );
    });

    it('renders reason and description together', () => {
        expect(apiErrorMessage(catcher, 'Request failed')).toBe(
            'Unauthorized: The request requires user authentication.'
        );
    });

    it('renders reason alone when the description is absent', () => {
        expect(apiErrorMessage({ error: { reason: 'Unauthorized' } }, 'Request failed')).toBe(
            'Unauthorized'
        );
    });

    it('renders description alone when the reason is absent', () => {
        expect(
            apiErrorMessage({ error: { description: 'Missing token.' } }, 'Request failed')
        ).toBe('Missing token.');
    });

    it('falls back for an unknown payload shape', () => {
        expect(apiErrorMessage(undefined, 'Request failed')).toBe('Request failed');
        expect(apiErrorMessage(null, 'Request failed')).toBe('Request failed');
        expect(apiErrorMessage({}, 'Request failed')).toBe('Request failed');
        expect(apiErrorMessage({ error: 'Unauthorized' }, 'Request failed')).toBe('Request failed');
    });
});

describe('apiRequest error message', () => {
    it('surfaces the Rocket catcher message on 401', async () => {
        setAuthToken('tok');
        vi.mocked(fetch).mockResolvedValue(
            jsonResponse(401, {
                error: {
                    code: 401,
                    reason: 'Unauthorized',
                    description: 'The request requires user authentication.'
                }
            })
        );

        const rejection = await apiCall('/x', { auth: true }).catch((e: unknown) => e);

        expect(rejection).toBeInstanceOf(ApiError);
        expect(rejection).toMatchObject({
            status: 401,
            message: 'Unauthorized: The request requires user authentication.'
        });
    });
});
