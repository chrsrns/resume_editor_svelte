import { test, expect } from '@playwright/test';
import { mockApiResponse, setAuthToken } from './mocks';

test('401 response clears auth token and user state', async ({ page }) => {
    await setAuthToken(page);
    await mockApiResponse(page, '**/api/me', 401, { error: 'Unauthorized' });
    await mockApiResponse(page, '**/api/resumes', 200, []);

    await page.goto('/resume_editor/resumes');

    await expect(page.getByRole('link', { name: 'Login', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Register', exact: true })).toBeVisible();
    await expect(page.getByText('Logout')).not.toBeVisible();
});
