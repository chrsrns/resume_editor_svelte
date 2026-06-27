import { test, expect, type Page } from '@playwright/test';
import { mockApiResponse, setAuthToken } from './mocks';

async function waitForApp(page: Page) {
    await page.waitForLoadState('networkidle');
}

const user = {
    id: 1,
    email: 'test@example.com',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
};

const resume = {
    id: 1,
    name: 'New Resume',
    profile_image_url: null,
    location: null,
    email: 'new@example.com',
    github_url: null,
    mobile_number: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    created_by: 1,
    is_public: false
};

async function mockDetailResponses(page: Page) {
    await mockApiResponse(page, `**/api/resume/${resume.id}`, 200, resume);
    await mockApiResponse(page, `**/api/resume/${resume.id}/education`, 200, []);
    await mockApiResponse(page, `**/api/resume/${resume.id}/work_experiences`, 200, []);
    await mockApiResponse(page, `**/api/resume/${resume.id}/skills`, 200, []);
    await mockApiResponse(page, `**/api/resume/${resume.id}/portfolio_projects`, 200, []);
    await mockApiResponse(page, `**/api/resume/${resume.id}/languages`, 200, []);
}

test('create resume form redirects to new resume detail', async ({ page }) => {
    await setAuthToken(page);
    await mockApiResponse(page, '**/api/auth/me', 200, user);
    await mockApiResponse(page, '**/api/new_resume', 200, resume);
    await mockDetailResponses(page);

    await page.goto('/resume_editor/resumes/new');
    await waitForApp(page);

    await page.getByRole('textbox', { name: 'Name' }).fill('New Resume');
    await page.getByRole('textbox', { name: 'Email' }).fill('new@example.com');
    await page.getByRole('button', { name: 'Create' }).click();

    await expect(page).toHaveURL('/resume_editor/resumes/1');
    await expect(page.getByText('New Resume')).toBeVisible();
});
