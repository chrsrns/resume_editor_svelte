import { test, expect, type Page } from '@playwright/test';
import { mockApiResponse, setAuthToken } from './mocks';
import type { Resume } from '$lib/types';

const resumeId = 1;
const resume: Resume = {
    id: resumeId,
    name: 'Test Resume',
    profile_image_url: null,
    location: null,
    email: 'test@example.com',
    github_url: null,
    mobile_number: null,
    executive_summary: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    created_by: 1,
    is_public: true
};

const user = {
    id: 1,
    email: 'test@example.com',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
};

async function waitForApp(page: Page) {
    await page.waitForLoadState('networkidle');
}

async function mockEmptySections(page: Page, id = resumeId) {
    await mockApiResponse(page, `**/api/resume/${id}/education`, 200, []);
    await mockApiResponse(page, `**/api/resume/${id}/work_experiences`, 200, []);
    await mockApiResponse(page, `**/api/resume/${id}/skills`, 200, []);
    await mockApiResponse(page, `**/api/resume/${id}/portfolio_projects`, 200, []);
    await mockApiResponse(page, `**/api/resume/${id}/languages`, 200, []);
}

async function openEditPage(page: Page, initialResume: Resume = resume) {
    await setAuthToken(page);
    await mockApiResponse(page, '**/api/auth/me', 200, user);
    await mockApiResponse(page, `**/api/resume/${resumeId}`, 200, initialResume);
    await mockEmptySections(page);
    await page.goto(`/resume_editor/resumes/${resumeId}/edit`);
    await waitForApp(page);
}

async function openListPage(page: Page) {
    await setAuthToken(page);
    await mockApiResponse(page, '**/api/auth/me', 200, user);
    await mockApiResponse(page, '**/api/resumes', 200, [resume]);
    await page.goto('/resume_editor/resumes');
    await waitForApp(page);
}

test('executive summary renders with line breaks on detail view', async ({ page }) => {
    const summary = 'Line 1\nLine 2\nLine 3';
    const resumeWithSummary = { ...resume, executive_summary: summary };

    await mockApiResponse(page, '**/api/auth/me', 200, null);
    await mockApiResponse(page, `**/api/resume/${resumeId}`, 200, resumeWithSummary);
    await mockEmptySections(page);

    await page.goto(`/resume_editor/resumes/${resumeId}`);
    await waitForApp(page);

    await expect(page.getByRole('heading', { name: 'Summary', level: 3 })).toBeVisible();
    await expect(page.locator('.summaryCard .copyButton')).toBeVisible();
    await expect(page.locator('.summary')).toHaveText(summary);
});

test('executive summary card shows placeholder when empty', async ({ page }) => {
    await mockApiResponse(page, '**/api/auth/me', 200, null);
    await mockApiResponse(page, `**/api/resume/${resumeId}`, 200, resume);
    await mockEmptySections(page);

    await page.goto(`/resume_editor/resumes/${resumeId}`);
    await waitForApp(page);

    await expect(page.getByRole('heading', { name: 'Summary', level: 3 })).toBeVisible();
    await expect(page.getByText('No summary')).toBeVisible();
    await expect(page.locator('.summary')).not.toBeVisible();
});

test('executive summary over 5000 chars blocks save and shows validation', async ({ page }) => {
    await openEditPage(page);

    const textarea = page.getByRole('textbox', { name: 'Executive summary' });
    await expect(textarea).toBeVisible();

    // maxlength prevents normal typing, so bypass it to test validation.
    const tooLong = 'a'.repeat(5001);
    await textarea.evaluate((el: HTMLElement, text: string) => {
        const t = el as HTMLTextAreaElement;
        t.value = text;
        t.dispatchEvent(new Event('input', { bubbles: true }));
    }, tooLong);

    const saveButton = page.getByRole('button', { name: 'Save', exact: true });
    await saveButton.click();

    await expect(
        page.getByText('Executive summary must be 5,000 characters or less')
    ).toBeVisible();
    await expect(saveButton).toBeDisabled();
});

test('whitespace-only executive summary is normalized to null on save', async ({ page }) => {
    const resumeWithSummary: Resume = { ...resume, executive_summary: 'Existing summary' };
    await openEditPage(page, resumeWithSummary);

    let putBody: Record<string, unknown> | null = null;
    await page.route(`**/api/resume/${resumeId}`, async (route) => {
        if (route.request().method() === 'PUT') {
            putBody = await route.request().postDataJSON();
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ body: { ...resume, executive_summary: null } })
            });
            return;
        }
        await route.fallback();
    });

    await page.getByRole('textbox', { name: 'Executive summary' }).fill('   ');

    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('All changes saved successfully!')).toBeVisible();

    expect(putBody).not.toBeNull();
    expect(putBody?.['executive_summary']).toBeNull();
});

test('executive summary survives markdown export and import round-trip', async ({ page }) => {
    const summary = 'Experienced engineer with a focus on developer tooling.';
    const resumeWithSummary = { ...resume, created_by: 1, executive_summary: summary };
    await openEditPage(page, resumeWithSummary);

    const markdown = `# Test Resume\n\n## Summary\n\n${summary}\n`;

    // Mock export to return markdown containing the summary section.
    await page.route(`**/api/resume/${resumeId}/export/markdown`, async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'text/markdown',
            body: markdown
        });
    });

    const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('button', { name: 'Export Markdown', exact: true }).click()
    ]);

    const importedId = 99;
    const importedResume = {
        ...resume,
        id: importedId,
        created_by: 1,
        executive_summary: summary
    };

    await openListPage(page);

    await page.route('**/api/resume/import/markdown', async (route) => {
        await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({ body: importedResume })
        });
    });

    await mockApiResponse(page, `**/api/resume/${importedId}`, 200, importedResume);
    await mockEmptySections(page, importedId);

    const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.getByRole('button', { name: 'Import Markdown', exact: true }).click()
    ]);

    const downloadPath = await download.path();
    await fileChooser.setFiles(downloadPath);

    await expect(page).toHaveURL(`/resume_editor/resumes/${importedId}/edit`);

    await page.goto(`/resume_editor/resumes/${importedId}`);
    await waitForApp(page);

    await expect(page.getByRole('heading', { name: 'Summary', level: 3 })).toBeVisible();
    await expect(page.locator('.summary')).toHaveText(summary);
});
