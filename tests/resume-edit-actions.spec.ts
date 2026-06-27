import { test, expect, type Page } from '@playwright/test';
import { mockApiResponse, mockApiMethods, setAuthToken } from './mocks';

const resumeId = 1;
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

test('delete resume from edit page', async ({ page }) => {
    await openEditPage(page);

    let deleteCalled = false;
    await mockApiMethods(page, `**/api/resume/${resumeId}`, {
        DELETE: {
            status: 204,
            body: {},
            callback: () => {
                deleteCalled = true;
            }
        }
    });

    page.on('dialog', (dialog) => dialog.accept());

    await page.locator('.header').getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page).toHaveURL('/resume_editor/resumes');
    expect(deleteCalled).toBe(true);
});

test('beforeunload warns when there are unsaved changes', async ({ page }) => {
    await openEditPage(page);

    await page.getByRole('tab', { name: 'Skills', exact: true }).click();
    await page.getByRole('textbox', { name: 'Skill name' }).first().fill('Svelte');
    await page.getByRole('spinbutton', { name: 'Confidence' }).first().fill('80');
    await page.getByRole('button', { name: 'Add', exact: true }).first().click();
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible();

    let dialogShown = false;
    page.on('dialog', (dialog) => {
        dialogShown = true;
        dialog.dismiss();
    });

    try {
        await page.goto('/resume_editor/resumes');
    } catch {
        // Navigation is aborted when the beforeunload dialog is dismissed.
    }
    expect(dialogShown).toBe(true);
});

test('discard changes resets dirty state', async ({ page }) => {
    await openEditPage(page);

    await mockApiMethods(page, `**/api/resume/${resumeId}/skills`, {
        GET: { status: 200, body: [] },
        POST: {
            status: 201,
            body: { id: 101, skill_name: 'Svelte', confidence_percentage: 80, display_order: 1 }
        }
    });

    await page.getByRole('tab', { name: 'Skills', exact: true }).click();
    await page.getByRole('textbox', { name: 'Skill name' }).first().fill('Svelte');
    await page.getByRole('spinbutton', { name: 'Confidence' }).first().fill('80');
    await page.getByRole('button', { name: 'Add', exact: true }).first().click();
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible();

    page.on('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Discard', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeHidden();
});
