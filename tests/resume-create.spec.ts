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
    video: null,
    mobile_number: null,
    executive_summary: null,
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

test('create resume with video sets payload and redirects', async ({ page }) => {
    await setAuthToken(page);
    await mockApiResponse(page, '**/api/auth/me', 200, user);
    await mockDetailResponses(page);

    const videoUrl = 'https://example.com/video';
    const resumeWithVideo = { ...resume, video: videoUrl };
    let postedBody: Record<string, unknown> | null = null;

    await page.route('**/api/new_resume', async (route) => {
        if (route.request().method() === 'POST') {
            postedBody = (await route.request().postDataJSON()) as Record<string, unknown> | null;
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ body: resumeWithVideo })
            });
            return;
        }
        await route.fallback();
    });

    await page.goto('/resume_editor/resumes/new');
    await waitForApp(page);

    await page.getByRole('textbox', { name: 'Name' }).fill('New Resume');
    await page.getByRole('textbox', { name: 'Email' }).fill('new@example.com');
    await page.getByRole('textbox', { name: 'GitHub URL' }).fill('https://github.com/example');
    await page.getByRole('textbox', { name: 'Video' }).fill(videoUrl);
    await page.getByRole('textbox', { name: 'Mobile number' }).fill('555-1234');
    await page.getByRole('button', { name: 'Create' }).click();

    await expect(page).toHaveURL('/resume_editor/resumes/1');
    expect(postedBody).not.toBeNull();
    expect(postedBody?.['video']).toBe(videoUrl);
});

test('create resume with blank video normalizes to null', async ({ page }) => {
    await setAuthToken(page);
    await mockApiResponse(page, '**/api/auth/me', 200, user);
    await mockDetailResponses(page);

    let postedBody: Record<string, unknown> | null = null;

    await page.route('**/api/new_resume', async (route) => {
        if (route.request().method() === 'POST') {
            postedBody = (await route.request().postDataJSON()) as Record<string, unknown> | null;
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ body: resume })
            });
            return;
        }
        await route.fallback();
    });

    await page.goto('/resume_editor/resumes/new');
    await waitForApp(page);

    await page.getByRole('textbox', { name: 'Name' }).fill('New Resume');
    await page.getByRole('textbox', { name: 'Email' }).fill('new@example.com');
    await page.getByRole('textbox', { name: 'Video' }).fill('   ');
    await page.getByRole('button', { name: 'Create' }).click();

    expect(postedBody).not.toBeNull();
    expect(postedBody?.['video']).toBeNull();
});

test('create resume rejects video over 500 chars', async ({ page }) => {
    await setAuthToken(page);
    await mockApiResponse(page, '**/api/auth/me', 200, user);
    await mockDetailResponses(page);

    await page.goto('/resume_editor/resumes/new');
    await waitForApp(page);

    await page.getByRole('textbox', { name: 'Name' }).fill('New Resume');
    await page.getByRole('textbox', { name: 'Email' }).fill('new@example.com');

    const tooLong = 'a'.repeat(501);
    await page.getByRole('textbox', { name: 'Video' }).evaluate((el: HTMLElement, text: string) => {
        const input = el as HTMLInputElement;
        input.value = text;
        input.dispatchEvent(new Event('input', { bubbles: true }));
    }, tooLong);

    await page.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByText('Video must be 500 characters or less')).toBeVisible();
    await expect(page).not.toHaveURL('/resume_editor/resumes/1');
});
