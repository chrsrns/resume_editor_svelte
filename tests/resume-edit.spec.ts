import { test, expect, type Page } from '@playwright/test';
import { mockApiFailure, mockApiResponse, clearApiRoute, setAuthToken } from './mocks';

const resumeId = 1;
const resumeUrl = `**/api/resume/${resumeId}`;
const resume: Record<string, unknown> = {
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

async function openEditPage(page: Page, initialResume: Record<string, unknown> = resume) {
    await setAuthToken(page);
    await mockApiResponse(page, '**/api/auth/me', 200, {
        id: Number(initialResume.created_by),
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
    });
    await mockApiResponse(page, resumeUrl, 200, initialResume);
    await mockEditSectionResponses(page, resumeId);
    await page.goto(`/resume_editor/resumes/${resumeId}/edit`);
    await page.waitForLoadState('networkidle');
}

test('edit resume video and save', async ({ page }) => {
    const videoUrl = 'https://example.com/video';
    const resumeWithVideo = { ...resume, video: videoUrl };
    let putBody: Record<string, unknown> | null = null;

    await openEditPage(page, resumeWithVideo);

    await page.route(resumeUrl, async (route) => {
        if (route.request().method() === 'PUT') {
            putBody = (await route.request().postDataJSON()) as Record<string, unknown> | null;
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ body: resumeWithVideo })
            });
            return;
        }
        await route.fallback();
    });

    const videoInput = page.getByRole('textbox', { name: 'Video' });
    await expect(videoInput).toHaveValue(videoUrl);

    const newUrl = 'https://example.com/new-video';
    await videoInput.fill(newUrl);
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    await expect(page.getByText('All changes saved successfully!')).toBeVisible();
    expect(putBody).not.toBeNull();
    expect(putBody?.['video']).toBe(newUrl);
});

test('edit resume blank video normalizes to null', async ({ page }) => {
    const videoUrl = 'https://example.com/video';
    const resumeWithVideo = { ...resume, video: videoUrl };
    let putBody: Record<string, unknown> | null = null;

    await openEditPage(page, resumeWithVideo);

    await page.route(resumeUrl, async (route) => {
        if (route.request().method() === 'PUT') {
            putBody = (await route.request().postDataJSON()) as Record<string, unknown> | null;
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ body: resume })
            });
            return;
        }
        await route.fallback();
    });

    const videoInput = page.getByRole('textbox', { name: 'Video' });
    await videoInput.fill('   ');
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    await expect(page.getByText('All changes saved successfully!')).toBeVisible();
    expect(putBody).not.toBeNull();
    expect(putBody?.['video']).toBeNull();
});

test('edit resume over 500 char video disables save', async ({ page }) => {
    const videoUrl = 'https://example.com/video';
    const resumeWithVideo = { ...resume, video: videoUrl };
    await openEditPage(page, resumeWithVideo);

    const videoInput = page.getByRole('textbox', { name: 'Video' });
    const tooLong = 'a'.repeat(501);
    await videoInput.evaluate((el: HTMLElement, text: string) => {
        const input = el as HTMLInputElement;
        input.value = text;
        input.dispatchEvent(new Event('input', { bubbles: true }));
    }, tooLong);

    await page.getByRole('button', { name: 'Save', exact: true }).click();

    await expect(page.getByText('Video must be 500 characters or less')).toBeVisible();
    await expect(page.getByText('All changes saved successfully!')).not.toBeVisible();
});
