import { test, expect, type Page } from '@playwright/test';
import { mockApiFailure, mockApiResponse, clearApiRoute, setAuthToken } from './mocks';

const resumeId = 1;
const resumeUrl = `**/api/resume/${resumeId}`;
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

test('retry button reloads a failed resume edit page', async ({ page }) => {
    await setAuthToken(page);
    await mockApiResponse(page, '**/api/auth/me', 200, {
        id: resume.created_by,
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
    });
    await mockApiFailure(page, resumeUrl);
    await page.goto(`/resume_editor/resumes/${resumeId}/edit`);

    await expect(page.getByText('Request failed')).toBeVisible();
    const retryButton = page.getByRole('button', { name: 'Retry' }).first();
    await expect(retryButton).toBeVisible();

    await clearApiRoute(page, resumeUrl);
    await mockApiResponse(page, resumeUrl, 200, resume);
    await mockEditSectionResponses(page, resumeId);

    await retryButton.click();

    await expect(page.getByText('Edit resume')).toBeVisible();
    await expect(page.getByText('Request failed')).not.toBeVisible();
});

async function mockEditSectionResponses(page: Page, resumeId: number) {
    await mockApiResponse(page, `**/api/resume/${resumeId}/skills`, 200, []);
    await mockApiResponse(page, `**/api/resume/${resumeId}/education`, 200, []);
    await mockApiResponse(page, `**/api/resume/${resumeId}/work_experiences`, 200, []);
    await mockApiResponse(page, `**/api/resume/${resumeId}/portfolio_projects`, 200, []);
    await mockApiResponse(page, `**/api/resume/${resumeId}/languages`, 200, []);
}
