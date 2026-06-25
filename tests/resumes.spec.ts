import { test, expect } from '@playwright/test';
import { mockApiFailure, mockApiResponse, clearApiRoute } from './mocks';

test('refresh button retries loading the resume list', async ({ page }) => {
    const listUrl = '**/api/resumes';

    await mockApiFailure(page, listUrl);
    await page.goto('/resume_editor/resumes');

    await expect(page.getByText('Request failed')).toBeVisible();
    const refreshButton = page.getByRole('button', { name: 'Refresh' });
    await expect(refreshButton).toBeVisible();

    await clearApiRoute(page, listUrl);
    await mockApiResponse(page, listUrl, 200, [
        {
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
        }
    ]);

    await refreshButton.click();

    await expect(page.getByText('Test Resume')).toBeVisible();
    await expect(page.getByText('Request failed')).not.toBeVisible();
});
