import { test, expect } from '@playwright/test';
import { mockApiResponse, setAuthToken } from './mocks';

const listUrl = '**/api/resumes';
const staleToken = 'expired-token';

const resume = {
    id: 'r1',
    name: 'Test Resume',
    profile_image_url: null,
    location: null,
    email: 'test@example.com',
    github_url: null,
    mobile_number: null,
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

// Every shape a real 401 can take, and the message the client derives from it.
// The last one is the string the stale-token report observed.
const authFailureShapes = [
    {
        label: 'Rocket HTML catcher',
        contentType: 'text/html',
        body: '<!DOCTYPE html><html lang="en"><head><title>401 Unauthorized</title></head><body><h1>401: Unauthorized</h1></body></html>',
        message: 'Failed to parse response'
    },
    {
        label: 'JSON envelope',
        contentType: 'application/json',
        body: JSON.stringify({ body: 'Unauthorized' }),
        message: 'Unauthorized'
    },
    {
        label: 'JSON body without a string',
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' }),
        message: 'Request failed'
    }
];

for (const shape of authFailureShapes) {
    test(`stale token first load renders "${shape.message}" and the reload is clean (${shape.label})`, async ({
        page
    }) => {
        const listAuthHeaders: (string | null)[] = [];

        await setAuthToken(page, staleToken, { once: true });
        await mockApiResponse(page, '**/api/auth/me', 401, { error: 'Unauthorized' });
        await page.route(listUrl, async (route) => {
            const authorization = route.request().headers()['authorization'] ?? null;
            listAuthHeaders.push(authorization);

            if (authorization === null) {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ body: [resume] })
                });
                return;
            }

            await route.fulfill({
                status: 401,
                contentType: shape.contentType,
                body: shape.body
            });
        });

        await page.goto('/resume_editor/resumes');

        await expect(page.getByText(shape.message)).toBeVisible();
        expect(listAuthHeaders[0]).toBe(`Bearer ${staleToken}`);
        expect(await page.evaluate(() => localStorage.getItem('resume_api_token'))).toBeNull();
        await expect(page.getByRole('link', { name: 'Login', exact: true })).toBeVisible();

        await page.reload();

        await expect(page.getByText(shape.message)).not.toBeVisible();
        await expect(page.getByText('Test Resume')).toBeVisible();
        expect(listAuthHeaders.at(-1)).toBeNull();
    });
}
