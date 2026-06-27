import type { Page, Request } from '@playwright/test';

export type MethodHandlers = Partial<Record<string, { status: number; body: unknown; callback?: (request: Request) => void | Promise<void> }>>;

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

export const setAuthToken = async (page: Page, token = 'test-token') => {
    await page.addInitScript((token) => {
        localStorage.setItem('resume_api_token', token);
    }, token);
};
