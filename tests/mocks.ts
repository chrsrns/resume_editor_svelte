import type { Page } from '@playwright/test';

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

export const clearApiRoute = async (page: Page, url: string | RegExp) => {
    await page.unroute(url);
};

export const setAuthToken = async (page: Page, token = 'test-token') => {
    await page.addInitScript((token) => {
        localStorage.setItem('resume_api_token', token);
    }, token);
};
