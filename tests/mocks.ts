import type { Page, Request } from '@playwright/test';

export type MethodHandlers = Partial<
    Record<
        string,
        { status: number; body: unknown; callback?: (request: Request) => void | Promise<void> }
    >
>;

export const mockApiResponse = <T>(page: Page, url: string | RegExp, status: number, body: T) => {
    return page.route(url, async (route) => {
        await route.fulfill({
            status,
            contentType: 'application/json',
            body: JSON.stringify({ body })
        });
    });
};

export const mockApiFailure = (page: Page, url: string | RegExp, status = 500) => {
    return page.route(url, async (route) => {
        await route.fulfill({
            status,
            contentType: 'application/json',
            body: JSON.stringify({ body: 'Request failed' })
        });
    });
};

export const mockApiAbort = (page: Page, url: string | RegExp) => {
    return page.route(url, async (route) => {
        await route.abort('failed');
    });
};

export const mockApiMethods = (page: Page, url: string | RegExp, handlers: MethodHandlers) => {
    return page.route(url, async (route) => {
        const method = route.request().method();
        const handler = handlers[method];
        if (handler) {
            await handler.callback?.(route.request());
            await route.fulfill({
                status: handler.status,
                contentType: 'application/json',
                body: JSON.stringify({ body: handler.body })
            });
        } else {
            await route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({ body: `Unexpected method ${method}` })
            });
        }
    });
};

export const clearApiRoute = async (page: Page, url: string | RegExp) => {
    await page.unroute(url);
};

/**
 * Seeds `resume_api_token` before every page load. `addInitScript` re-runs on
 * each navigation, so pass `{ once: true }` when the app's own 401 handling
 * must clear the token for good — the seed then applies to the first load only
 * and a later reload sees no token.
 *
 * `expiresAt` seeds `resume_api_expires_at` so a test can boot with an expiry
 * already in the past. Leave it out to boot with an unknown expiry.
 */
export const setAuthToken = async (
    page: Page,
    token = 'test-token',
    options: { once?: boolean; expiresAt?: string | null } = {}
) => {
    await page.addInitScript(
        (seed: { token: string; once: boolean; expiresAt: string | null }) => {
            if (seed.once && sessionStorage.getItem('resume_api_token_seeded') === '1') return;
            localStorage.setItem('resume_api_token', seed.token);
            if (seed.expiresAt !== null) {
                localStorage.setItem('resume_api_expires_at', seed.expiresAt);
            }
            if (seed.once) sessionStorage.setItem('resume_api_token_seeded', '1');
        },
        { token, once: options.once ?? false, expiresAt: options.expiresAt ?? null }
    );
};
