import { describe, it, expect, vi, afterEach } from 'vitest';
import { get } from 'svelte/store';

const TOKEN_KEY = 'resume_api_token';
const EXPIRES_KEY = 'resume_api_expires_at';
const NOTICE_KEY = 'resume_api_session_expired';

const PAST = '2020-01-01T00:00:00Z';
const FUTURE = '2099-01-01T00:00:00Z';

type FakeStorage = {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
    removeItem: (key: string) => void;
    clear: () => void;
    key: (index: number) => string | null;
    readonly length: number;
};

function makeFakeStorage(seed: Record<string, string> = {}): FakeStorage {
    const map = new Map<string, string>(Object.entries(seed));
    return {
        getItem: (key) => map.get(key) ?? null,
        setItem: (key, value) => {
            map.set(key, value);
        },
        removeItem: (key) => {
            map.delete(key);
        },
        clear: () => map.clear(),
        key: (index) => Array.from(map.keys())[index] ?? null,
        get length() {
            return map.size;
        }
    };
}

/**
 * Re-imports the auth module with a fresh module registry, a browser-looking
 * `$app/environment` stub and a fake `localStorage`, so the boot gate runs
 * against the seeded keys rather than the module's first-load defaults.
 */
async function reloadWithStorage(seed: Record<string, string> = {}) {
    vi.resetModules();
    const env = (await import('$app/environment')) as unknown as {
        setTestBrowser?: (value: boolean) => void;
    };
    env.setTestBrowser?.(true);
    const storage = makeFakeStorage(seed);
    vi.stubGlobal('localStorage', storage);
    return storage;
}

async function loadAuth(seed: Record<string, string> = {}) {
    const storage = await reloadWithStorage(seed);
    const auth = await import('$lib/auth');
    return { auth, storage };
}

async function loadAuthWithNotice(seed: Record<string, string> = {}) {
    const storage = await reloadWithStorage(seed);
    const auth = await import('$lib/auth');
    const notice = await import('$lib/sessionExpiry');
    return { auth, notice, storage };
}

function jsonResponse(status: number, payload: unknown): Response {
    return new Response(JSON.stringify(payload), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('parseSessionExpiry', () => {
    it('treats a naive wire timestamp as UTC', async () => {
        const { auth } = await loadAuth();

        expect(auth.parseSessionExpiry('2026-10-19T17:11:03.084619')).toBe(
            Date.parse('2026-10-19T17:11:03.084619Z')
        );
    });

    it('honours an explicit offset instead of appending one', async () => {
        const { auth } = await loadAuth();

        expect(auth.parseSessionExpiry('2026-10-19T12:11:03-05:00')).toBe(
            Date.parse('2026-10-19T12:11:03-05:00')
        );
        expect(auth.parseSessionExpiry('2026-10-19T17:11:03Z')).toBe(
            Date.parse('2026-10-19T17:11:03Z')
        );
    });

    it('returns null for a missing or unparsable value', async () => {
        const { auth } = await loadAuth();

        expect(auth.parseSessionExpiry(null)).toBeNull();
        expect(auth.parseSessionExpiry('')).toBeNull();
        expect(auth.parseSessionExpiry('not-a-timestamp')).toBeNull();
    });
});

describe('expiry gate at auth-token store initialization', () => {
    it('clears a past-expiry token and raises the notice', async () => {
        const { auth, notice, storage } = await loadAuthWithNotice({
            [TOKEN_KEY]: 'expired-token',
            [EXPIRES_KEY]: PAST
        });

        expect(get(auth.authToken)).toBeNull();
        expect(storage.getItem(TOKEN_KEY)).toBeNull();
        expect(storage.getItem(EXPIRES_KEY)).toBeNull();
        expect(get(notice.sessionExpired)).toBe(true);
    });

    it('keeps the token attached when the stored expiry is missing', async () => {
        const { auth, notice } = await loadAuthWithNotice({ [TOKEN_KEY]: 'expired-token' });

        expect(get(auth.authToken)).toBe('expired-token');
        expect(get(notice.sessionExpired)).toBe(false);
    });

    it('keeps the token attached when the stored expiry is unparsable', async () => {
        const { auth, notice } = await loadAuthWithNotice({
            [TOKEN_KEY]: 'expired-token',
            [EXPIRES_KEY]: 'not-a-timestamp'
        });

        expect(get(auth.authToken)).toBe('expired-token');
        expect(get(notice.sessionExpired)).toBe(false);
    });

    it('stays silent when the expiry key exists without a token', async () => {
        const { auth, notice } = await loadAuthWithNotice({ [EXPIRES_KEY]: PAST });

        expect(get(auth.authToken)).toBeNull();
        expect(get(notice.sessionExpired)).toBe(false);
    });

    it('keeps a token whose expiry is still ahead', async () => {
        const { auth, notice } = await loadAuthWithNotice({
            [TOKEN_KEY]: 'good-token',
            [EXPIRES_KEY]: FUTURE
        });

        expect(get(auth.authToken)).toBe('good-token');
        expect(get(notice.sessionExpired)).toBe(false);
    });
});

describe('refreshCurrentUser after the boot gate', () => {
    it('issues no /auth/me request once the gate cleared the token', async () => {
        const { auth } = await loadAuth({ [TOKEN_KEY]: 'expired-token', [EXPIRES_KEY]: PAST });
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        const session = await import('$lib/session');
        await expect(session.refreshCurrentUser()).resolves.toBeNull();

        expect(fetchMock).not.toHaveBeenCalled();
        expect(get(session.currentUser)).toBeNull();
        expect(get(auth.authToken)).toBeNull();
    });
});

describe('expiry key lifecycle', () => {
    it('writes both keys on login and clears them on logout', async () => {
        const { auth, storage } = await loadAuth();

        auth.setAuthToken('tok', FUTURE);

        expect(storage.getItem(TOKEN_KEY)).toBe('tok');
        expect(storage.getItem(EXPIRES_KEY)).toBe(FUTURE);

        auth.clearAuthToken();

        expect(storage.getItem(TOKEN_KEY)).toBeNull();
        expect(storage.getItem(EXPIRES_KEY)).toBeNull();
    });

    it('clears the notice flag on a successful login', async () => {
        const { auth, notice, storage } = await loadAuthWithNotice({
            [TOKEN_KEY]: 'expired-token',
            [EXPIRES_KEY]: PAST
        });
        expect(get(notice.sessionExpired)).toBe(true);

        auth.setAuthToken('tok', FUTURE);

        expect(storage.getItem(NOTICE_KEY)).toBeNull();
        expect(get(notice.sessionExpired)).toBe(false);
    });

    it('clears both keys when an authenticated request answers 401', async () => {
        const { auth, storage } = await loadAuth();
        auth.setAuthToken('tok', FUTURE);
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(jsonResponse(401, { body: 'unauthorized' }))
        );

        const client = await import('$lib/api/client');
        await expect(client.apiCall('/x', { auth: true })).rejects.toBeInstanceOf(Error);

        expect(storage.getItem(TOKEN_KEY)).toBeNull();
        expect(storage.getItem(EXPIRES_KEY)).toBeNull();
    });
});
