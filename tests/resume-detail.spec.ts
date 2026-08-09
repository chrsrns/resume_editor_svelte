import { test, expect, type Page } from '@playwright/test';
import { mockApiFailure, mockApiResponse, clearApiRoute } from './mocks';

const resumeId = 1;
const resumeUrl = `**/api/resume/${resumeId}`;
const resume = {
    id: resumeId,
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
    is_public: true
};

test('retry button reloads a failed resume', async ({ page }) => {
    await mockApiFailure(page, resumeUrl);
    await page.goto(`/resume_editor/resumes/${resumeId}`);

    await expect(page.getByText('Request failed')).toBeVisible();
    const retryButton = page.getByRole('button', { name: 'Retry' }).first();
    await expect(retryButton).toBeVisible();

    await clearApiRoute(page, resumeUrl);
    await mockApiResponse(page, resumeUrl, 200, resume);
    await mockSectionResponses(page, resumeId);

    await retryButton.click();

    await expect(page.getByText('Test Resume')).toBeVisible();
    await expect(page.getByText('Request failed')).not.toBeVisible();
});

test('retry button reloads failed resume sections', async ({ page }) => {
    await mockApiResponse(page, resumeUrl, 200, resume);
    await mockSectionFailures(page, resumeId);
    await page.goto(`/resume_editor/resumes/${resumeId}`);

    await expect(page.getByText('Test Resume')).toBeVisible();
    await expect(page.getByText('Request failed')).toBeVisible();
    const retryButton = page.getByRole('button', { name: 'Retry' }).first();
    await expect(retryButton).toBeVisible();

    await clearApiRoute(page, '**/api/resume/**');
    await mockApiResponse(page, resumeUrl, 200, resume);
    await mockSectionResponses(page, resumeId);

    await retryButton.click();

    await expect(page.getByText('Request failed')).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Retry' })).not.toBeVisible();

    await page.getByRole('tab', { name: 'Education' }).click();
    await expect(page.getByText('No education entries yet.')).toBeVisible();
});

async function mockSectionResponses(page: Page, resumeId: number) {
    await mockApiResponse(page, `**/api/resume/${resumeId}/education`, 200, []);
    await mockApiResponse(page, `**/api/resume/${resumeId}/work_experiences`, 200, []);
    await mockApiResponse(page, `**/api/resume/${resumeId}/skills`, 200, []);
    await mockApiResponse(page, `**/api/resume/${resumeId}/portfolio_projects`, 200, []);
    await mockApiResponse(page, `**/api/resume/${resumeId}/languages`, 200, []);
}

async function mockSectionFailures(page: Page, resumeId: number) {
    await mockApiFailure(page, `**/api/resume/${resumeId}/education`);
    await mockApiFailure(page, `**/api/resume/${resumeId}/work_experiences`);
    await mockApiFailure(page, `**/api/resume/${resumeId}/skills`);
    await mockApiFailure(page, `**/api/resume/${resumeId}/portfolio_projects`);
    await mockApiFailure(page, `**/api/resume/${resumeId}/languages`);
}

test('detail view shows video as link when present', async ({ page }) => {
    const videoUrl = 'https://example.com/video';
    const resumeWithVideo = { ...resume, video: videoUrl };

    await mockApiResponse(page, resumeUrl, 200, resumeWithVideo);
    await mockSectionResponses(page, resumeId);
    await page.goto(`/resume_editor/resumes/${resumeId}`);
    await page.waitForLoadState('networkidle');

    const videoLink = page.getByRole('link', { name: videoUrl });
    await expect(videoLink).toBeVisible();
    await expect(videoLink).toHaveAttribute('href', videoUrl);
});

test('detail view shows dash when video is null', async ({ page }) => {
    await mockApiResponse(page, resumeUrl, 200, resume);
    await mockSectionResponses(page, resumeId);
    await page.goto(`/resume_editor/resumes/${resumeId}`);
    await page.waitForLoadState('networkidle');

    const basicsPanel = page.locator('#panel-basics');
    await expect(basicsPanel.getByText('-')).toBeVisible();
});
