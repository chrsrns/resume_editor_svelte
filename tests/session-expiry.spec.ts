import { test, expect, type Page } from '@playwright/test';
import { mockApiResponse, setAuthToken, resumeListPage } from './mocks';

const BANNER = 'You were signed out because your session expired.';
const listUrl = /\/api\/resumes(\?.*)?$/;
const meUrl = '**/api/auth/me';
const logoutUrl = '**/api/auth/logout';

const PAST_EXPIRY = '2020-01-01T00:00:00Z';
const FUTURE_EXPIRY = '2099-01-01T00:00:00Z';

const rocketCatcher = {
    error: {
        code: 401,
        reason: 'Unauthorized',
        description: 'The request requires user authentication.'
    }
};

const user = {
    id: 1,
    email: 'test@example.com',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
};

const resume = {
    id: 'r1',
    name: 'Test Resume',
    profile_image_url: null,
    location: null,
    email: 'test@example.com',
    github_url: null,
    video: null,
    mobile_number: null,
    executive_summary: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    created_by: null,
    visibility: 'public',
    is_variant: false,
    base_resume_id: null,
    show_variant_tag: null,
    company_name: null,
    role_title: null,
    target_date: null,
    target_date_precision: null,
    job_description: null,
    variant_label: null
};

function trackApiCalls(page: Page) {
    const calls: { url: string; authorization: string | null }[] = [];
    page.on('request', (request) => {
        calls.push({
            url: request.url(),
            authorization: request.headers()['authorization'] ?? null
        });
    });
    return calls;
}

test('a stored expiry in the past renders the anonymous list and the notice', async ({ page }) => {
    const calls = trackApiCalls(page);

    await setAuthToken(page, 'expired-token', { expiresAt: PAST_EXPIRY });
    await mockApiResponse(page, meUrl, 401, { error: 'Unauthorized' });
    await mockApiResponse(page, listUrl, 200, resumeListPage([resume]));

    await page.goto('/resume_editor/resumes');

    await expect(page.getByText(BANNER)).toBeVisible();
    await expect(page.getByText('Test Resume')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Login', exact: true })).toBeVisible();

    const listCalls = calls.filter((call) => call.url.includes('/api/resumes'));
    expect(listCalls[0]?.authorization).toBeNull();
    expect(calls.filter((call) => call.url.includes('/api/auth/me'))).toHaveLength(0);
    expect(await page.evaluate(() => localStorage.getItem('resume_api_token'))).toBeNull();
});

test('a session that died server side shows the notice without an error region', async ({
    page
}) => {
    // Expiry unknown, so the dead bearer is still attached; the read answers
    // anonymously the way the backend does once it ignores an unresolvable
    // bearer, and the auth check is what reports the death.
    await setAuthToken(page, 'expired-token');
    await mockApiResponse(page, meUrl, 401, { error: 'Unauthorized' });
    await mockApiResponse(page, listUrl, 200, resumeListPage([resume]));

    await page.goto('/resume_editor/resumes');

    await expect(page.getByText(BANNER)).toBeVisible();
    await expect(page.getByText('Test Resume')).toBeVisible();
    await expect(page.getByText('Request failed')).not.toBeVisible();
    await expect(page.getByRole('link', { name: 'Login', exact: true })).toBeVisible();
});

test('the notice survives a reload', async ({ page }) => {
    // `once` keeps the token out of the reload, so the notice can only come
    // from the stored flag rather than from the gate firing a second time.
    await setAuthToken(page, 'expired-token', { once: true, expiresAt: PAST_EXPIRY });
    await mockApiResponse(page, meUrl, 401, { error: 'Unauthorized' });
    await mockApiResponse(page, listUrl, 200, resumeListPage([resume]));

    await page.goto('/resume_editor/resumes');
    await expect(page.getByText(BANNER)).toBeVisible();

    await page.reload();

    await expect(page.getByText(BANNER)).toBeVisible();
    await expect(page.getByText('Test Resume')).toBeVisible();
});

test('a second tab shows the notice and a dismissal clears it there', async ({ page }) => {
    const context = page.context();
    await context.route(meUrl, async (route) => {
        await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ body: 'Unauthorized' })
        });
    });
    await context.route(listUrl, async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ body: resumeListPage([resume]) })
        });
    });

    await setAuthToken(page, 'expired-token', { expiresAt: PAST_EXPIRY });
    await page.goto('/resume_editor/resumes');
    await expect(page.getByText(BANNER)).toBeVisible();

    const second = await context.newPage();
    await second.goto('/resume_editor/resumes');
    await expect(second.getByText(BANNER)).toBeVisible();

    await page.getByRole('button', { name: 'Dismiss' }).click();

    await expect(page.getByText(BANNER)).not.toBeVisible();
    await expect(second.getByText(BANNER)).not.toBeVisible();

    await second.close();
});

test('a successful login clears the notice', async ({ page }) => {
    await setAuthToken(page, 'expired-token', { expiresAt: PAST_EXPIRY });
    await page.route(meUrl, async (route) => {
        const authorization = route.request().headers()['authorization'] ?? null;
        await route.fulfill({
            status: authorization === null ? 401 : 200,
            contentType: 'application/json',
            body: JSON.stringify(authorization === null ? { body: 'Unauthorized' } : { body: user })
        });
    });
    await mockApiResponse(page, listUrl, 200, resumeListPage([resume]));
    await mockApiResponse(page, '**/api/auth/login', 200, {
        token: 'fresh-token',
        expires_at: FUTURE_EXPIRY
    });

    await page.goto('/resume_editor/auth/login');
    await expect(page.getByText(BANNER)).toBeVisible();

    await page.getByRole('textbox', { name: 'Email' }).fill('test@example.com');
    await page.getByRole('textbox', { name: 'Password' }).fill('password123');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL('/resume_editor/resumes');
    await expect(page.getByText(BANNER)).not.toBeVisible();
    await expect(page.getByText('Logout')).toBeVisible();
});

test('a deliberate logout does not raise the notice', async ({ page }) => {
    // The logout call itself answers 401, so the suppression is exercised
    // rather than bypassed by a successful response.
    await setAuthToken(page, 'good-token', { expiresAt: FUTURE_EXPIRY });
    await mockApiResponse(page, meUrl, 200, user);
    await mockApiResponse(page, listUrl, 200, resumeListPage([resume]));
    await page.route(logoutUrl, async (route) => {
        await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify(rocketCatcher)
        });
    });

    await page.goto('/resume_editor/resumes');
    await expect(page.getByText('Logout')).toBeVisible();
    await expect(page.getByText(BANNER)).not.toBeVisible();

    await page.getByRole('button', { name: 'Logout' }).click();

    await expect(page).toHaveURL('/resume_editor/auth/login');
    await expect(page.getByText(BANNER)).not.toBeVisible();
    await expect(page.getByRole('link', { name: 'Login', exact: true })).toBeVisible();
});

test('an authenticated 401 outside logout raises the notice', async ({ page }) => {
    await setAuthToken(page, 'stale-token');
    await mockApiResponse(page, meUrl, 200, user);
    await page.route(listUrl, async (route) => {
        await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify(rocketCatcher)
        });
    });

    await page.goto('/resume_editor/resumes');

    await expect(page.getByText(BANNER)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Login', exact: true })).toBeVisible();
});

test('a visitor who was never signed in sees no notice', async ({ page }) => {
    await mockApiResponse(page, listUrl, 200, resumeListPage([resume]));

    await page.goto('/resume_editor/resumes');

    await expect(page.getByText('Test Resume')).toBeVisible();
    await expect(page.getByText(BANNER)).not.toBeVisible();
});
