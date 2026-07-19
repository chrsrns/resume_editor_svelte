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

test('education year-only saves start_date as YYYY', async ({ page }) => {
    await openEditPage(page);

    let savedPayload: any;
    await mockApiMethods(page, `**/api/resume/${resumeId}/education`, {
        GET: { status: 200, body: [] },
        POST: {
            status: 201,
            body: {
                id: 201,
                education_stage: 'Bachelor',
                institution_name: 'Uni',
                degree: '',
                start_date: '2020',
                end_date: null,
                description: '',
                display_order: 1,
                active: true,
                created_at: '',
                updated_at: ''
            },
            callback: (req) => {
                savedPayload = req.postDataJSON();
            }
        }
    });

    await page.getByRole('tab', { name: 'Education', exact: true }).click();
    await page.getByRole('textbox', { name: 'Stage (e.g. Bachelor)' }).fill('Bachelor');
    await page.getByRole('textbox', { name: 'Institution' }).fill('Uni');
    const educationPanel = page.locator('#panel-education');
    await educationPanel.getByLabel('Start date year').selectOption('2020');
    await page.getByRole('button', { name: 'Add education', exact: true }).click();

    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('All changes saved successfully!')).toBeVisible();
    expect(savedPayload.start_date).toBe('2020');
    expect(savedPayload.end_date).toBeNull();
});

test('education month-year start and end save as YYYY-MM', async ({ page }) => {
    await openEditPage(page);

    let savedPayload: any;
    await mockApiMethods(page, `**/api/resume/${resumeId}/education`, {
        GET: { status: 200, body: [] },
        POST: {
            status: 201,
            body: {
                id: 201,
                education_stage: 'Bachelor',
                institution_name: 'Uni',
                degree: '',
                start_date: '2020-09',
                end_date: '2021-06',
                description: '',
                display_order: 1,
                active: true,
                created_at: '',
                updated_at: ''
            },
            callback: (req) => {
                savedPayload = req.postDataJSON();
            }
        }
    });

    await page.getByRole('tab', { name: 'Education', exact: true }).click();
    await page.getByRole('textbox', { name: 'Stage (e.g. Bachelor)' }).fill('Bachelor');
    await page.getByRole('textbox', { name: 'Institution' }).fill('Uni');
    const educationPanel = page.locator('#panel-education');
    await educationPanel.getByLabel('Start date year').selectOption('2020');
    await educationPanel.getByLabel('Start date month').selectOption('9');
    await educationPanel.getByLabel('End date year').selectOption('2021');
    await educationPanel.getByLabel('End date month').selectOption('6');
    await page.getByRole('button', { name: 'Add education', exact: true }).click();

    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('All changes saved successfully!')).toBeVisible();
    expect(savedPayload.start_date).toBe('2020-09');
    expect(savedPayload.end_date).toBe('2021-06');
});

test('education full-date clamps day when year changes to non-leap', async ({ page }) => {
    await openEditPage(page);

    let savedPayload: any;
    await mockApiMethods(page, `**/api/resume/${resumeId}/education`, {
        GET: { status: 200, body: [] },
        POST: {
            status: 201,
            body: {
                id: 201,
                education_stage: 'Bachelor',
                institution_name: 'Uni',
                degree: '',
                start_date: '2021-02-28',
                end_date: null,
                description: '',
                display_order: 1,
                active: true,
                created_at: '',
                updated_at: ''
            },
            callback: (req) => {
                savedPayload = req.postDataJSON();
            }
        }
    });

    await page.getByRole('tab', { name: 'Education', exact: true }).click();
    await page.getByRole('textbox', { name: 'Stage (e.g. Bachelor)' }).fill('Bachelor');
    await page.getByRole('textbox', { name: 'Institution' }).fill('Uni');
    const educationPanel = page.locator('#panel-education');
    await educationPanel.getByLabel('Start date year').selectOption('2020');
    await educationPanel.getByLabel('Start date month').selectOption('2');
    await educationPanel.getByLabel('Start date day').selectOption('29');
    await educationPanel.getByLabel('Start date year').selectOption('2021');
    await expect(educationPanel.getByLabel('Start date day')).toHaveValue('28');
    await page.getByRole('button', { name: 'Add education', exact: true }).click();

    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('All changes saved successfully!')).toBeVisible();
    expect(savedPayload.start_date).toBe('2021-02-28');
});

test('education invalid date range blocks save', async ({ page }) => {
    await openEditPage(page);

    await page.getByRole('tab', { name: 'Education', exact: true }).click();
    await page.getByRole('textbox', { name: 'Stage (e.g. Bachelor)' }).fill('Bachelor');
    await page.getByRole('textbox', { name: 'Institution' }).fill('Uni');
    const educationPanel = page.locator('#panel-education');
    await educationPanel.getByLabel('Start date year').selectOption('2022');
    await educationPanel.getByLabel('End date year').selectOption('2021');
    await page.getByRole('button', { name: 'Add education', exact: true }).click();
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
    await expect(page.getByText('All changes saved successfully!')).not.toBeVisible();
});

test('work full-date and month-year round-trip', async ({ page }) => {
    await openEditPage(page);

    let savedPayload: any;
    await mockApiMethods(page, `**/api/resume/${resumeId}/work_experiences`, {
        GET: { status: 200, body: [] },
        POST: {
            status: 201,
            body: {
                id: 401,
                job_title: 'Engineer',
                company_name: 'Co',
                start_date: '2020-06-15',
                end_date: '2021-03',
                description: '',
                display_order: 1,
                active: true,
                created_at: '',
                updated_at: ''
            },
            callback: (req) => {
                savedPayload = req.postDataJSON();
            }
        }
    });

    await page.getByRole('tab', { name: 'Work', exact: true }).click();
    await page.getByRole('textbox', { name: 'Job title' }).fill('Engineer');
    await page.getByRole('textbox', { name: 'Company' }).fill('Co');
    const workPanel = page.locator('#panel-work');
    await workPanel.getByLabel('Start date year').selectOption('2020');
    await workPanel.getByLabel('Start date month').selectOption('6');
    await workPanel.getByLabel('Start date day').selectOption('15');
    await workPanel.getByLabel('End date year').selectOption('2021');
    await workPanel.getByLabel('End date month').selectOption('3');
    await page.getByRole('button', { name: 'Add work experience', exact: true }).click();

    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('All changes saved successfully!')).toBeVisible();
    expect(savedPayload.start_date).toBe('2020-06-15');
    expect(savedPayload.end_date).toBe('2021-03');
});

test('day select is disabled until month is chosen', async ({ page }) => {
    await openEditPage(page);

    await page.getByRole('tab', { name: 'Education', exact: true }).click();
    const educationPanel = page.locator('#panel-education');
    await educationPanel.getByLabel('Start date year').selectOption('2020');
    await expect(educationPanel.getByLabel('Start date day')).toBeDisabled();
    await educationPanel.getByLabel('Start date month').selectOption('4');
    await expect(educationPanel.getByLabel('Start date day')).toBeEnabled();
});
