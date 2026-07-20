import { test, expect } from '@playwright/test';
import { mockApiResponse, setAuthToken } from './mocks';

const resumeId = 1;
const resumeUrl = `**/api/resume/${resumeId}`;
const skillsUrl = `**/api/resume/${resumeId}/skills`;

const resume = {
    id: resumeId,
    name: 'Test Resume',
    profile_image_url: null,
    location: null,
    email: 'test@example.com',
    github_url: null,
    mobile_number: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    created_by: 1,
    is_public: true
};

test('failed save keeps dirty state so retry is possible', async ({ page }) => {
    await setAuthToken(page);
    await mockApiResponse(page, '**/api/auth/me', 200, {
        id: resume.created_by,
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
    });
    await mockApiResponse(page, resumeUrl, 200, resume);
    await mockApiResponse(page, `**/api/resume/${resumeId}/education`, 200, []);
    await mockApiResponse(page, `**/api/resume/${resumeId}/work_experiences`, 200, []);
    await mockApiResponse(page, `**/api/resume/${resumeId}/portfolio_projects`, 200, []);
    await mockApiResponse(page, `**/api/resume/${resumeId}/languages`, 200, []);

    // List skills succeeds, but creating a new skill fails.
    await page.route(skillsUrl, async (route) => {
        if (route.request().method() === 'GET') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ body: [] })
            });
        } else {
            await route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({ body: 'Request failed' })
            });
        }
    });

    await page.goto(`/resume_editor/resumes/${resumeId}/edit?tab=skills`);
    await expect(page.getByText('Edit resume')).toBeVisible();

    // Add a new skill.
    await page.getByRole('textbox', { name: 'Skill name', exact: true }).first().fill('Playwright');
    await page.getByRole('button', { name: 'Add', exact: true }).first().click();

    // Save should trigger a skill creation that fails.
    const saveButton = page.getByRole('button', { name: 'Save', exact: true });
    await expect(saveButton).toBeVisible();
    await saveButton.click();

    await expect(page.getByText('Failed to save 1 item(s)')).toBeVisible();

    // Dismiss the popup.
    await page.getByRole('button', { name: 'Dismiss', exact: true }).click();

    // The failed new skill must still be dirty, so the Save button remains visible.
    await expect(saveButton).toBeVisible();
    await expect(saveButton).toBeEnabled();
});
