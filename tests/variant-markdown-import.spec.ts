import { test, expect, type Page } from '@playwright/test';
import { mockApiResponse, setAuthToken } from './mocks';
import type { Resume } from '$lib/types';

const user = {
    id: 1,
    email: 'owner@example.com',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
};

const baseResume: Resume = {
    id: 1,
    name: 'Base Resume',
    profile_image_url: null,
    location: null,
    email: 'owner@example.com',
    github_url: null,
    video: null,
    mobile_number: null,
    executive_summary: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    created_by: 1,
    is_public: true,
    is_variant: false,
    base_resume_id: null,
    show_variant_tag: null,
    company_name: null,
    role_title: null,
    target_date: null,
    target_date_precision: null,
    job_description: null,
    variant_label: null
};

const variantResume: Resume = {
    ...baseResume,
    id: 2,
    name: 'Variant Resume',
    is_variant: true,
    base_resume_id: 1,
    show_variant_tag: true,
    company_name: 'Acme',
    role_title: 'Engineer',
    target_date: '2026-03',
    target_date_precision: 'month',
    job_description: 'Build things',
    variant_label: 'Platform'
};

async function waitForApp(page: Page) {
    await page.waitForLoadState('networkidle');
}

async function mockEmptySections(page: Page, id: number) {
    await mockApiResponse(page, `**/api/resume/${id}/education`, 200, []);
    await mockApiResponse(page, `**/api/resume/${id}/work_experiences`, 200, []);
    await mockApiResponse(page, `**/api/resume/${id}/skills`, 200, []);
    await mockApiResponse(page, `**/api/resume/${id}/portfolio_projects`, 200, []);
    await mockApiResponse(page, `**/api/resume/${id}/languages`, 200, []);
}

// --- API helper posts to the explicit route with auth and markdown content type ---

test('API helper posts to the explicit import route with auth and markdown content type', async ({
    page
}) => {
    await setAuthToken(page);
    await mockApiResponse(page, '**/api/auth/me', 200, user);
    await mockApiResponse(page, '**/api/resumes', 200, []);

    let authHeader: string | null = null;
    let contentType: string | null = null;
    let postBody: string | null = null;

    await page.route('**/api/resume/2/import/markdown', async (route) => {
        authHeader = route.request().headers()['authorization'] ?? null;
        contentType = route.request().headers()['content-type'] ?? null;
        postBody = route.request().postData();
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ body: variantResume })
        });
    });

    await page.goto('/resume_editor/resumes');
    await waitForApp(page);

    const result = await page.evaluate(async () => {
        const moduleUrl = '/resume_editor/src/lib/api/resumes.ts';
        const api = (await import(moduleUrl)) as {
            importResumeMarkdownInto: (id: number, markdown: string) => Promise<unknown>;
        };
        return api.importResumeMarkdownInto(2, '# Variant\n\n- Email: owner@example.com\n');
    });

    expect(result).toMatchObject({ id: 2, is_variant: true });
    expect(authHeader).toBe('Bearer test-token');
    expect(contentType).toMatch(/text\/markdown/);
    expect(postBody).toContain('# Variant');
});

async function openVariantDetail(
    page: Page,
    current: Resume = variantResume,
    viewer: typeof user | null = user
) {
    if (viewer) {
        await setAuthToken(page);
        await mockApiResponse(page, '**/api/auth/me', 200, viewer);
    } else {
        await mockApiResponse(page, '**/api/auth/me', 200, null);
    }
    await mockApiResponse(page, `**/api/resume/${current.id}`, 200, current);
    if (current.base_resume_id !== null) {
        await mockApiResponse(page, `**/api/resume/${current.base_resume_id}`, 200, baseResume);
    }
    await mockEmptySections(page, current.id);
    await page.goto(`/resume_editor/resumes/${current.id}`);
    await expect(page.getByRole('heading', { name: current.name })).toBeVisible();
}

async function pickImportFile(page: Page, name = 'variant.md') {
    const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.getByRole('button', { name: 'Import Markdown', exact: true }).click()
    ]);
    await fileChooser.setFiles({
        name,
        mimeType: 'text/markdown',
        buffer: Buffer.from('# Imported\n\n- Email: owner@example.com\n')
    });
}

// --- owner variant detail shows Import Markdown before Export Markdown ---

test('owner variant detail shows Import Markdown before Export Markdown', async ({ page }) => {
    await openVariantDetail(page);

    const actions = page.locator('.actions');
    const buttons = actions.locator('button');
    await expect(buttons.nth(0)).toHaveText(/Import Markdown/);
    await expect(buttons.nth(1)).toHaveText(/Export Markdown/);
});

// --- non-owner, visitor, and base detail show no import action ---

test('non-owner, visitor, and base detail show no import action', async ({ page }) => {
    const otherUser = { ...user, id: 2 };
    await openVariantDetail(page, variantResume, otherUser);
    await expect(page.getByRole('button', { name: 'Import Markdown', exact: true })).toHaveCount(0);

    await openVariantDetail(page, variantResume, null);
    await expect(page.getByRole('button', { name: 'Import Markdown', exact: true })).toHaveCount(0);

    await openVariantDetail(page, baseResume, user);
    await expect(page.getByRole('button', { name: 'Import Markdown', exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'New variant' })).toBeVisible();
});

// --- confirm accept sends the import and reloads new data in place ---

test('confirm accept sends the import and reloads new data in place', async ({ page }) => {
    let current = { ...variantResume };
    await setAuthToken(page);
    await mockApiResponse(page, '**/api/auth/me', 200, user);
    await page.route('**/api/resume/2', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ body: current })
        });
    });
    await mockApiResponse(page, '**/api/resume/1', 200, baseResume);
    await mockEmptySections(page, 2);

    let importUrl: string | null = null;
    let authHeader: string | null = null;
    let contentType: string | null = null;
    await page.route('**/api/resume/2/import/markdown', async (route) => {
        importUrl = route.request().url();
        authHeader = route.request().headers()['authorization'] ?? null;
        contentType = route.request().headers()['content-type'] ?? null;
        current = {
            ...variantResume,
            name: 'Imported Variant',
            executive_summary: 'Fresh summary'
        };
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ body: current })
        });
    });

    await page.goto('/resume_editor/resumes/2');
    await expect(page.getByRole('heading', { name: 'Variant Resume' })).toBeVisible();

    let dialogMessage = '';
    page.once('dialog', async (dialog) => {
        dialogMessage = dialog.message();
        await dialog.accept();
    });
    await pickImportFile(page);

    await expect(page.getByRole('heading', { name: 'Imported Variant' })).toBeVisible();
    await expect(page.getByText('Fresh summary')).toBeVisible();
    await expect(page).toHaveURL('/resume_editor/resumes/2');
    expect(dialogMessage).toMatch(/replace/i);
    expect(importUrl).toContain('/api/resume/2/import/markdown');
    expect(authHeader).toBe('Bearer test-token');
    expect(contentType).toMatch(/text\/markdown/);
});

// --- confirm cancel sends no request ---

test('confirm cancel sends no request', async ({ page }) => {
    let importCalls = 0;
    await openVariantDetail(page);
    await page.route('**/api/resume/2/import/markdown', async (route) => {
        importCalls += 1;
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ body: variantResume })
        });
    });

    page.once('dialog', (dialog) => void dialog.dismiss());
    await pickImportFile(page);
    await page.waitForTimeout(300);

    expect(importCalls).toBe(0);
    await expect(page.getByRole('heading', { name: 'Variant Resume' })).toBeVisible();
});

// --- same-file re-pick re-fires the confirm flow ---

test('same-file re-pick re-fires the confirm flow', async ({ page }) => {
    let importCalls = 0;
    await openVariantDetail(page);
    await page.route('**/api/resume/2/import/markdown', async (route) => {
        importCalls += 1;
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ body: variantResume })
        });
    });

    page.once('dialog', (dialog) => void dialog.dismiss());
    await pickImportFile(page);
    await page.waitForTimeout(200);
    expect(importCalls).toBe(0);

    page.once('dialog', (dialog) => void dialog.accept());
    await pickImportFile(page);

    await expect.poll(() => importCalls).toBe(1);
});

// --- action disabled while the request is in flight ---

test('action disabled while the request is in flight', async ({ page }) => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
        release = resolve;
    });
    let started = false;
    let current = { ...variantResume };
    await setAuthToken(page);
    await mockApiResponse(page, '**/api/auth/me', 200, user);
    await page.route('**/api/resume/2', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ body: current })
        });
    });
    await mockApiResponse(page, '**/api/resume/1', 200, baseResume);
    await mockEmptySections(page, 2);
    await page.route('**/api/resume/2/import/markdown', async (route) => {
        started = true;
        await gate;
        current = { ...variantResume, name: 'Imported Variant' };
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ body: current })
        });
    });

    await page.goto('/resume_editor/resumes/2');
    await expect(page.getByRole('heading', { name: 'Variant Resume' })).toBeVisible();

    page.once('dialog', (dialog) => void dialog.accept());
    await pickImportFile(page);

    const importButton = page.getByRole('button', { name: 'Import Markdown', exact: true });
    await expect.poll(() => started).toBe(true);
    await expect(importButton).toBeDisabled();

    release();

    await expect(page.getByRole('heading', { name: 'Imported Variant' })).toBeVisible();
    await expect(importButton).toBeEnabled();
});

// --- JSON failure shows the API body verbatim ---

test('JSON failure shows the API body verbatim', async ({ page }) => {
    await openVariantDetail(page);
    await page.route('**/api/resume/2/import/markdown', async (route) => {
        await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ body: 'Metadata keys require a variant target' })
        });
    });

    page.once('dialog', (dialog) => void dialog.accept());
    await pickImportFile(page);

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Metadata keys require a variant target')).toBeVisible();
    await expect(page).toHaveURL('/resume_editor/resumes/2');

    await page.getByRole('dialog').getByRole('button', { name: 'Close' }).last().click();
    await expect(page.getByRole('button', { name: 'Import Markdown', exact: true })).toBeEnabled();
});

// --- non-JSON failure shows the fallback message ---

test('non-JSON failure shows the fallback message', async ({ page }) => {
    await openVariantDetail(page);
    await page.route('**/api/resume/2/import/markdown', async (route) => {
        await route.fulfill({
            status: 413,
            contentType: 'text/plain',
            body: 'Payload Too Large'
        });
    });

    page.once('dialog', (dialog) => void dialog.accept());
    await pickImportFile(page);

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog').getByText('Failed to parse response')).toBeVisible();
});

// --- list-page 200 update redirects to the updated resume's edit page ---

test('list-page 200 update redirects to the updated resume edit page', async ({ page }) => {
    await setAuthToken(page);
    await mockApiResponse(page, '**/api/auth/me', 200, user);
    await mockApiResponse(page, '**/api/resumes', 200, [variantResume]);

    await page.route('**/api/resume/import/markdown', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ body: variantResume })
        });
    });
    await mockApiResponse(page, '**/api/resume/2', 200, variantResume);
    await mockEmptySections(page, 2);

    await page.goto('/resume_editor/resumes');
    await page.waitForLoadState('networkidle');

    const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.getByRole('button', { name: 'Import Markdown', exact: true }).click()
    ]);
    await fileChooser.setFiles({
        name: 'variant.md',
        mimeType: 'text/markdown',
        buffer: Buffer.from('# Variant Resume\n\n- Email: owner@example.com\n')
    });

    await expect(page).toHaveURL('/resume_editor/resumes/2/edit');
    await expect(page.getByText('Edit resume')).toBeVisible();
});
