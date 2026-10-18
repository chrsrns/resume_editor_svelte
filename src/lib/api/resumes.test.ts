import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportResumeMarkdown, importResumeMarkdown, importResumeMarkdownInto } from './resumes';
import { setAuthToken, clearAuthToken } from '$lib/auth';

const catcher = {
    error: {
        code: 401,
        reason: 'Unauthorized',
        description: 'The request requires user authentication.'
    }
};

const catcherMessage = 'Unauthorized: The request requires user authentication.';

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

// The markdown endpoints go through apiRawRequest, which builds no message of
// its own, so each call site has to reach the shared precedence rule.
describe('markdown call sites surface the catcher message', () => {
    it('exportResumeMarkdown', async () => {
        setAuthToken('tok');
        vi.mocked(fetch).mockResolvedValue(jsonResponse(401, catcher));

        await expect(exportResumeMarkdown('r1')).rejects.toMatchObject({
            status: 401,
            message: catcherMessage
        });
    });

    it('importResumeMarkdown', async () => {
        setAuthToken('tok');
        vi.mocked(fetch).mockResolvedValue(jsonResponse(400, catcher));

        await expect(importResumeMarkdown('# x')).rejects.toMatchObject({
            status: 400,
            message: catcherMessage
        });
    });

    it('importResumeMarkdownInto', async () => {
        setAuthToken('tok');
        vi.mocked(fetch).mockResolvedValue(jsonResponse(400, catcher));

        await expect(importResumeMarkdownInto('r1', '# x')).rejects.toMatchObject({
            status: 400,
            message: catcherMessage
        });
    });
});
