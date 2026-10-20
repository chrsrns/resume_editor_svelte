import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listResumes } from './resumes';
import type { ResumePage } from '$lib/types';
import { clearAuthToken } from '$lib/auth';

function jsonResponse(status: number, payload: unknown): Response {
    return new Response(JSON.stringify(payload), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}

const emptyPage: ResumePage = { items: [], total: 0, limit: 20, offset: 0 };

function fetchUrl(): string {
    return vi.mocked(fetch).mock.calls[0][0] as string;
}

beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    clearAuthToken();
});

describe('listResumes', () => {
    it('requests /resumes with no query when params are omitted', async () => {
        vi.mocked(fetch).mockResolvedValue(jsonResponse(200, { body: emptyPage }));

        await listResumes();

        expect(fetchUrl()).toBe('/api/resumes');
    });

    it('builds limit/offset/sort/order/search params verbatim', async () => {
        vi.mocked(fetch).mockResolvedValue(jsonResponse(200, { body: emptyPage }));

        await listResumes({
            limit: 20,
            offset: 40,
            sort: 'name',
            order: 'desc',
            search: 'backend role'
        });

        const params = new URL(`https://example.test${fetchUrl()}`).searchParams;
        expect(params.get('limit')).toBe('20');
        expect(params.get('offset')).toBe('40');
        expect(params.get('sort')).toBe('name');
        expect(params.get('order')).toBe('desc');
        expect(params.get('search')).toBe('backend role');
    });

    it('percent-encodes &, %, +, and whitespace inside search', async () => {
        vi.mocked(fetch).mockResolvedValue(jsonResponse(200, { body: emptyPage }));

        await listResumes({ search: 'a&b %+' });

        const params = new URL(`https://example.test${fetchUrl()}`).searchParams;
        expect(params.get('search')).toBe('a&b %+');
    });

    it('omits unset params', async () => {
        vi.mocked(fetch).mockResolvedValue(jsonResponse(200, { body: emptyPage }));

        await listResumes({ offset: 20 });

        const url = fetchUrl();
        expect(url).toContain('offset=20');
        expect(url).not.toContain('limit=');
        expect(url).not.toContain('sort=');
        expect(url).not.toContain('search=');
    });

    it('unwraps the envelope body as a ResumePage', async () => {
        const page: ResumePage = {
            items: [
                {
                    base: { id: 'b1', is_variant: false },
                    variants: [{ id: 'v1', is_variant: true }]
                } as ResumePage['items'][number]
            ],
            total: 1,
            limit: 20,
            offset: 0
        };
        vi.mocked(fetch).mockResolvedValue(jsonResponse(200, { body: page }));

        await expect(listResumes()).resolves.toEqual(page);
    });

    it('rejects a flat-array items shape as a contract mismatch', async () => {
        vi.mocked(fetch).mockResolvedValue(
            jsonResponse(200, {
                body: { items: [{ id: 'r1', name: 'Flat Row' }], total: 1, limit: 20, offset: 0 }
            })
        );

        await expect(listResumes()).rejects.toThrowError(/contract mismatch|unexpected shape/i);
    });
});
