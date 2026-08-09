import { test, expect, type Page } from '@playwright/test';
import { mockApiResponse, setAuthToken } from './mocks';

const resumeId = 1;
const resume = {
    id: resumeId,
    name: 'My Resume',
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

const user = {
    id: 1,
    email: 'test@example.com',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
};

async function waitForApp(page: Page) {
    await page.waitForLoadState('networkidle');
}

async function mockEmptySections(page: Page) {
    await mockApiResponse(page, `**/api/resume/${resumeId}/education`, 200, []);
    await mockApiResponse(page, `**/api/resume/${resumeId}/work_experiences`, 200, []);
    await mockApiResponse(page, `**/api/resume/${resumeId}/skills`, 200, []);
    await mockApiResponse(page, `**/api/resume/${resumeId}/portfolio_projects`, 200, []);
    await mockApiResponse(page, `**/api/resume/${resumeId}/languages`, 200, []);
}

async function openEditPage(page: Page) {
    await setAuthToken(page);
    await mockApiResponse(page, '**/api/auth/me', 200, user);
    await mockApiResponse(page, `**/api/resume/${resumeId}`, 200, resume);
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

// --- V2: export sends Authorization header ---

test('export on edit page sends Authorization header', async ({ page }) => {
    await openEditPage(page);

    let exportAuthHeader: string | null = null;
    await page.route(`**/api/resume/${resumeId}/export/markdown`, async (route) => {
        exportAuthHeader = route.request().headers()['authorization'] ?? null;
        await route.fulfill({
            status: 200,
            contentType: 'text/markdown',
            body: '# My Resume\n'
        });
    });

    await page.getByRole('button', { name: 'Export Markdown', exact: true }).click();

    expect(exportAuthHeader).toBe('Bearer test-token');
});

// --- V2: export on view page sends no auth header when unauthenticated ---

test('export on view page sends no Authorization header when not logged in', async ({ page }) => {
    await mockApiResponse(page, '**/api/auth/me', 200, null);
    await mockApiResponse(page, `**/api/resume/${resumeId}`, 200, resume);
    await mockEmptySections(page);
    await page.goto(`/resume_editor/resumes/${resumeId}`);
    await waitForApp(page);

    let exportAuthHeader: string | undefined;
    await page.route(`**/api/resume/${resumeId}/export/markdown`, async (route) => {
        exportAuthHeader = route.request().headers()['authorization'];
        await route.fulfill({
            status: 200,
            contentType: 'text/markdown',
            body: '# My Resume\n'
        });
    });

    await page.getByRole('button', { name: 'Export Markdown', exact: true }).click();

    expect(exportAuthHeader).toBeUndefined();
});

// --- V37: export button visible on view page to all visitors ---

test('export button visible on view page when not logged in', async ({ page }) => {
    await mockApiResponse(page, '**/api/auth/me', 200, null);
    await mockApiResponse(page, `**/api/resume/${resumeId}`, 200, resume);
    await mockEmptySections(page);
    await page.goto(`/resume_editor/resumes/${resumeId}`);
    await waitForApp(page);

    await expect(page.getByRole('button', { name: 'Export Markdown', exact: true })).toBeVisible();
});

// --- V38: export error shows ErrorDialog ---

test('export API error shows error dialog on edit page', async ({ page }) => {
    await openEditPage(page);

    await page.route(`**/api/resume/${resumeId}/export/markdown`, async (route) => {
        await route.fulfill({
            status: 403,
            contentType: 'application/json',
            body: JSON.stringify({ body: 'Forbidden' })
        });
    });

    await page.getByRole('button', { name: 'Export Markdown', exact: true }).click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog').getByText(/forbidden|error/i)).toBeVisible();
});

// --- V39: import success redirects to /resumes/<id>/edit ---

test('import success navigates to new resume edit page', async ({ page }) => {
    await openListPage(page);

    const newResume = { ...resume, id: 99, name: 'Imported Resume', created_by: 1 };

    await page.route('**/api/resume/import/markdown', async (route) => {
        await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({ body: newResume })
        });
    });
    await mockApiResponse(page, '**/api/resume/99', 200, newResume);
    await mockApiResponse(page, '**/api/resume/99/education', 200, []);
    await mockApiResponse(page, '**/api/resume/99/work_experiences', 200, []);
    await mockApiResponse(page, '**/api/resume/99/skills', 200, []);
    await mockApiResponse(page, '**/api/resume/99/portfolio_projects', 200, []);
    await mockApiResponse(page, '**/api/resume/99/languages', 200, []);

    const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.getByRole('button', { name: 'Import Markdown', exact: true }).click()
    ]);
    await fileChooser.setFiles({
        name: 'resume.md',
        mimeType: 'text/markdown',
        buffer: Buffer.from('# Imported Resume\n\n- Email: test@example.com\n')
    });

    await expect(page).toHaveURL(`/resume_editor/resumes/99/edit`);
});

// --- V39: import sends Authorization header ---

test('import sends Authorization header', async ({ page }) => {
    await openListPage(page);

    const newResume = { ...resume, id: 99, name: 'Imported Resume', created_by: 1 };

    await page.route('**/api/resume/import/markdown', async (route) => {
        await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({ body: newResume })
        });
    });
    await mockApiResponse(page, '**/api/resume/99', 200, newResume);
    await mockApiResponse(page, '**/api/resume/99/education', 200, []);
    await mockApiResponse(page, '**/api/resume/99/work_experiences', 200, []);
    await mockApiResponse(page, '**/api/resume/99/skills', 200, []);
    await mockApiResponse(page, '**/api/resume/99/portfolio_projects', 200, []);
    await mockApiResponse(page, '**/api/resume/99/languages', 200, []);

    const requestPromise = page.waitForRequest(
        (req) => req.url().includes('/resume/import/markdown') && req.method() === 'POST'
    );

    const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.getByRole('button', { name: 'Import Markdown', exact: true }).click()
    ]);
    await fileChooser.setFiles({
        name: 'resume.md',
        mimeType: 'text/markdown',
        buffer: Buffer.from('# Imported Resume\n\n- Email: test@example.com\n')
    });

    const request = await requestPromise;
    expect(request.headers()['authorization']).toBe('Bearer test-token');
});

// --- V39: import API error shows error dialog ---

test('import API error shows error dialog with API message', async ({ page }) => {
    await openListPage(page);

    await page.route('**/api/resume/import/markdown', async (route) => {
        await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ body: 'Missing required field: Email' })
        });
    });

    const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.getByRole('button', { name: 'Import Markdown', exact: true }).click()
    ]);
    await fileChooser.setFiles({
        name: 'bad.md',
        mimeType: 'text/markdown',
        buffer: Buffer.from('not a valid resume\n')
    });

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog').getByText('Missing required field: Email')).toBeVisible();
});

// --- V39: import sends Content-Type: text/markdown ---

test('import sends Content-Type text/markdown', async ({ page }) => {
    await openListPage(page);

    const newResume = { ...resume, id: 99, name: 'Imported Resume', created_by: 1 };

    await page.route('**/api/resume/import/markdown', async (route) => {
        await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({ body: newResume })
        });
    });
    await mockApiResponse(page, '**/api/resume/99', 200, newResume);
    await mockApiResponse(page, '**/api/resume/99/education', 200, []);
    await mockApiResponse(page, '**/api/resume/99/work_experiences', 200, []);
    await mockApiResponse(page, '**/api/resume/99/skills', 200, []);
    await mockApiResponse(page, '**/api/resume/99/portfolio_projects', 200, []);
    await mockApiResponse(page, '**/api/resume/99/languages', 200, []);

    const requestPromise = page.waitForRequest(
        (req) => req.url().includes('/resume/import/markdown') && req.method() === 'POST'
    );

    const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.getByRole('button', { name: 'Import Markdown', exact: true }).click()
    ]);
    await fileChooser.setFiles({
        name: 'resume.md',
        mimeType: 'text/markdown',
        buffer: Buffer.from('# Imported Resume\n\n- Email: test@example.com\n')
    });

    const request = await requestPromise;
    expect(request.headers()['content-type']).toMatch(/text\/markdown/);
});

// --- V86: import with Video returns resume with video ---

test('import with Video field returns resume with video and shows it', async ({ page }) => {
    await openListPage(page);

    const videoUrl = 'https://example.com/video';
    const newResume = { ...resume, id: 99, name: 'Imported Resume', created_by: 1, video: videoUrl };

    await page.route('**/api/resume/import/markdown', async (route) => {
        await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({ body: newResume })
        });
    });
    await mockApiResponse(page, '**/api/resume/99', 200, newResume);
    await mockApiResponse(page, '**/api/resume/99/education', 200, []);
    await mockApiResponse(page, '**/api/resume/99/work_experiences', 200, []);
    await mockApiResponse(page, '**/api/resume/99/skills', 200, []);
    await mockApiResponse(page, '**/api/resume/99/portfolio_projects', 200, []);
    await mockApiResponse(page, '**/api/resume/99/languages', 200, []);

    const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.getByRole('button', { name: 'Import Markdown', exact: true }).click()
    ]);
    await fileChooser.setFiles({
        name: 'resume.md',
        mimeType: 'text/markdown',
        buffer: Buffer.from(`# Imported Resume\n\n- Email: test@example.com\n- Video: ${videoUrl}\n`)
    });

    await expect(page).toHaveURL(`/resume_editor/resumes/99/edit`);

    await page.goto('/resume_editor/resumes/99');
    await waitForApp(page);

    const videoLink = page.getByRole('link', { name: videoUrl });
    await expect(videoLink).toBeVisible();
    await expect(videoLink).toHaveAttribute('href', videoUrl);
});

// --- V87: import without Video stores video as null ---

test('import without Video shows dash placeholder', async ({ page }) => {
    await openListPage(page);

    const newResume = { ...resume, id: 99, name: 'Imported Resume', created_by: 1 };

    await page.route('**/api/resume/import/markdown', async (route) => {
        await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({ body: newResume })
        });
    });
    await mockApiResponse(page, '**/api/resume/99', 200, newResume);
    await mockApiResponse(page, '**/api/resume/99/education', 200, []);
    await mockApiResponse(page, '**/api/resume/99/work_experiences', 200, []);
    await mockApiResponse(page, '**/api/resume/99/skills', 200, []);
    await mockApiResponse(page, '**/api/resume/99/portfolio_projects', 200, []);
    await mockApiResponse(page, '**/api/resume/99/languages', 200, []);

    const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.getByRole('button', { name: 'Import Markdown', exact: true }).click()
    ]);
    await fileChooser.setFiles({
        name: 'resume.md',
        mimeType: 'text/markdown',
        buffer: Buffer.from('# Imported Resume\n\n- Email: test@example.com\n')
    });

    await expect(page).toHaveURL(`/resume_editor/resumes/99/edit`);

    await page.goto('/resume_editor/resumes/99');
    await waitForApp(page);

    const videoRow = page.locator('.fieldRow', { hasText: 'Video' });
    await expect(videoRow.getByText('-')).toBeVisible();
});

// --- V3: 401 on export clears token and currentUser ---

test('export 401 clears auth token and currentUser', async ({ page }) => {
    await setAuthToken(page);
    await mockApiResponse(page, '**/api/auth/me', 200, user);
    await mockApiResponse(page, `**/api/resume/${resumeId}`, 200, resume);
    await mockEmptySections(page);

    await page.route(`**/api/resume/${resumeId}/export/markdown`, async (route) => {
        await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ body: 'Unauthorized' })
        });
    });

    await page.goto(`/resume_editor/resumes/${resumeId}`);
    await waitForApp(page);

    await page.getByRole('button', { name: 'Export Markdown', exact: true }).click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog').getByText('Unauthorized')).toBeVisible();

    const token = await page.evaluate(() => localStorage.getItem('resume_api_token'));
    expect(token).toBeNull();

    await expect(page.getByRole('link', { name: 'Edit Resume' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Login' })).toBeVisible();
});

// --- V3: 401 on import clears token ---

test('import 401 clears auth token', async ({ page }) => {
    await setAuthToken(page);
    await mockApiResponse(page, '**/api/auth/me', 200, user);
    await mockApiResponse(page, '**/api/resumes', 200, [resume]);

    await page.route('**/api/resume/import/markdown', async (route) => {
        await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ body: 'Unauthorized' })
        });
    });

    await page.goto('/resume_editor/resumes');
    await waitForApp(page);

    const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.getByRole('button', { name: 'Import Markdown', exact: true }).click()
    ]);
    await fileChooser.setFiles({
        name: 'resume.md',
        mimeType: 'text/markdown',
        buffer: Buffer.from('# Resume\n')
    });

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog').getByText('Unauthorized')).toBeVisible();

    const token = await page.evaluate(() => localStorage.getItem('resume_api_token'));
    expect(token).toBeNull();

    await expect(page.getByRole('button', { name: 'Import Markdown', exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Login to create' })).toBeVisible();
});
