import { test, expect } from '@playwright/test';

const listUrl = '**/api/resumes';

const resume = {
    id: 1,
    name: 'Test Resume',
    profile_image_url: null,
    location: null,
    email: 'test@example.com',
    github_url: null,
    mobile_number: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    created_by: null,
    is_public: true
};

test('retries 500 responses with an empty body', async ({ page }) => {
    let requestCount = 0;
    await page.route(listUrl, async (route) => {
        requestCount++;
        if (requestCount === 1) {
            await route.fulfill({ status: 500, body: '' });
            return;
        }
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ body: [resume] })
        });
    });

    await page.goto('/resume_editor/resumes');

    await expect(page.getByText('Test Resume')).toBeVisible();
    await expect(page.getByText('Request failed')).not.toBeVisible();
    expect(requestCount).toBeGreaterThanOrEqual(2);
});
