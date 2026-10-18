import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listRevisions, getRevision, getRevisionDiff, restoreRevision } from './resumes';
import { setAuthToken, clearAuthToken } from '$lib/auth';

function jsonResponse(status: number, payload: unknown): Response {
    return new Response(JSON.stringify(payload), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}

function lastCall(): { url: string; init: RequestInit } {
    const calls = vi.mocked(fetch).mock.calls;
    return {
        url: calls[calls.length - 1][0] as string,
        init: calls[calls.length - 1][1] as RequestInit
    };
}

beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    clearAuthToken();
    setAuthToken('tok');
});

describe('revision API functions', () => {
    it('listRevisions GETs the timeline with a bearer header', async () => {
        const rows = [
            {
                revision: 1,
                created_at: '2026-01-01T00:00:00',
                created_by: 1,
                action: 'personalinfo',
                is_restore: false
            }
        ];
        vi.mocked(fetch).mockResolvedValue(jsonResponse(200, { body: rows }));

        await expect(listRevisions('r1')).resolves.toEqual(rows);

        const { url, init } = lastCall();
        expect(url).toBe('/api/resume/r1/revisions');
        expect(init.method).toBe('GET');
        expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    });

    it('getRevision GETs a single revision', async () => {
        vi.mocked(fetch).mockResolvedValue(jsonResponse(200, { body: { revision: 2 } }));

        await getRevision('r1', 2);

        const { url, init } = lastCall();
        expect(url).toBe('/api/resume/r1/revisions/2');
        expect(init.method).toBe('GET');
    });

    it('getRevisionDiff GETs the diff; unified flag only when true', async () => {
        vi.mocked(fetch).mockImplementation(() =>
            Promise.resolve(jsonResponse(200, { body: { revision: 2, changes: [] } }))
        );

        await getRevisionDiff('r1', 2);
        expect(lastCall().url).toBe('/api/resume/r1/revisions/2/diff');

        await getRevisionDiff('r1', 2, true);
        expect(lastCall().url).toBe('/api/resume/r1/revisions/2/diff?unified=true');

        await getRevisionDiff('r1', 2, false);
        expect(lastCall().url).toBe('/api/resume/r1/revisions/2/diff');
    });

    it('restoreRevision POSTs expected_revision and unwraps the Resume body', async () => {
        const resume = { id: 'r1', name: 'Restored' };
        vi.mocked(fetch).mockResolvedValue(jsonResponse(200, { body: resume }));

        await expect(restoreRevision('r1', 2, 5)).resolves.toEqual(resume);

        const { url, init } = lastCall();
        expect(url).toBe('/api/resume/r1/revisions/2/restore');
        expect(init.method).toBe('POST');
        expect(JSON.parse(init.body as string)).toEqual({ expected_revision: 5 });
        expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    });
});
