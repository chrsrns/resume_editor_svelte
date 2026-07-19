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

async function closeSavePopup(page: Page) {
    await page.locator('.popup-header .close-button').click();
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

test('add skill and save', async ({ page }) => {
    await openEditPage(page);

    let createCalled = false;
    await mockApiMethods(page, `**/api/resume/${resumeId}/skills`, {
        GET: { status: 200, body: [] },
        POST: {
            status: 201,
            body: { id: 101, skill_name: 'Svelte', confidence_percentage: 80, display_order: 1 },
            callback: () => {
                createCalled = true;
            }
        }
    });

    await page.getByRole('tab', { name: 'Skills', exact: true }).click();
    await page.getByRole('textbox', { name: 'Skill name' }).first().fill('Svelte');
    await page.getByRole('spinbutton', { name: 'Confidence' }).first().fill('80');
    await page.getByRole('button', { name: 'Add', exact: true }).first().click();

    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('All changes saved successfully!')).toBeVisible();
    expect(createCalled).toBe(true);
});

test('empty skill confidence blocks save', async ({ page }) => {
    await openEditPage(page);

    await page.getByRole('tab', { name: 'Skills', exact: true }).click();
    await page.getByRole('textbox', { name: 'Skill name' }).first().fill('Svelte');
    await page.getByRole('spinbutton', { name: 'Confidence' }).first().clear();
    await page.getByRole('button', { name: 'Add', exact: true }).first().click();

    await expect(page.getByText('Confidence is required')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
});

test('add education with key point and save', async ({ page }) => {
    await openEditPage(page);

    let educationCreated = false;
    let keyPointCreated = false;

    await mockApiMethods(page, `**/api/resume/${resumeId}/education`, {
        GET: { status: 200, body: [] },
        POST: {
            status: 201,
            body: {
                id: 201,
                education_stage: 'Bachelor',
                institution_name: 'Uni',
                degree: 'CS',
                start_date: '2020-01-01',
                end_date: '',
                description: '',
                display_order: 1,
                active: true,
                created_at: '',
                updated_at: ''
            },
            callback: () => {
                educationCreated = true;
            }
        }
    });

    await mockApiMethods(page, `**/api/resume/${resumeId}/education/*/key_points`, {
        POST: {
            status: 201,
            body: {
                id: 301,
                education_id: 201,
                key_point: "Dean's list",
                display_order: 1,
                active: true,
                created_at: '',
                updated_at: ''
            },
            callback: () => {
                keyPointCreated = true;
            }
        }
    });

    await page.getByRole('tab', { name: 'Education', exact: true }).click();
    await page.getByRole('textbox', { name: 'Stage (e.g. Bachelor)' }).fill('Bachelor');
    await page.getByRole('textbox', { name: 'Institution' }).fill('Uni');
    const educationPanel = page.locator('#panel-education');
    await educationPanel.getByLabel('Start date year').selectOption('2020');
    await educationPanel.getByLabel('Start date month').selectOption('1');
    await educationPanel.getByLabel('Start date day').selectOption('1');
    await page.getByRole('button', { name: 'Add education', exact: true }).click();

    await page.getByRole('button', { name: 'Bachelor — Uni' }).click();
    await page.getByRole('group', { name: 'Education' }).getByRole('textbox', { name: 'Add key point' }).fill("Dean's list");
    await page.getByRole('group', { name: 'Education' }).getByRole('button', { name: 'Add', exact: true }).click();

    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('All changes saved successfully!')).toBeVisible();
    expect(educationCreated).toBe(true);
    expect(keyPointCreated).toBe(true);
});

test('partial save keeps failed section dirty and cleans successful sections', async ({ page }) => {
    await openEditPage(page);

    let skillCreateCount = 0;
    let educationCreateCount = 0;

    await mockApiMethods(page, `**/api/resume/${resumeId}/skills`, {
        GET: { status: 200, body: [] },
        POST: {
            status: 201,
            body: { id: 101, skill_name: 'Svelte', confidence_percentage: 80, display_order: 1 },
            callback: () => {
                skillCreateCount++;
            }
        }
    });
    await mockApiMethods(page, `**/api/resume/${resumeId}/education`, {
        GET: { status: 200, body: [] },
        POST: { status: 500, body: 'Request failed' }
    });

    await page.getByRole('tab', { name: 'Skills', exact: true }).click();
    await page.getByRole('textbox', { name: 'Skill name' }).first().fill('Svelte');
    await page.getByRole('spinbutton', { name: 'Confidence' }).first().fill('80');
    await page.getByRole('button', { name: 'Add', exact: true }).first().click();

    await page.getByRole('tab', { name: 'Education', exact: true }).click();
    await page.getByRole('textbox', { name: 'Stage (e.g. Bachelor)' }).fill('Bachelor');
    await page.getByRole('textbox', { name: 'Institution' }).fill('Uni');
    const educationPanel = page.locator('#panel-education');
    await educationPanel.getByLabel('Start date year').selectOption('2020');
    await educationPanel.getByLabel('Start date month').selectOption('1');
    await educationPanel.getByLabel('Start date day').selectOption('1');
    await page.getByRole('button', { name: 'Add education', exact: true }).click();

    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('Failed to save 1 item(s)')).toBeVisible();
    expect(skillCreateCount).toBe(1);
    expect(educationCreateCount).toBe(0);
    await closeSavePopup(page);

    // Retry: only education should be sent this time.
    await mockApiMethods(page, `**/api/resume/${resumeId}/education`, {
        GET: { status: 200, body: [] },
        POST: {
            status: 201,
            body: {
                id: 201,
                education_stage: 'Bachelor',
                institution_name: 'Uni',
                degree: '',
                start_date: '2020-01-01',
                end_date: '',
                description: '',
                display_order: 1,
                active: true,
                created_at: '',
                updated_at: ''
            },
            callback: () => {
                educationCreateCount++;
            }
        }
    });

    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('All changes saved successfully!')).toBeVisible();
    expect(skillCreateCount).toBe(1);
    expect(educationCreateCount).toBe(1);
});

test('delete work and key point removes child before parent', async ({ page }) => {
    await openEditPage(page);

    // Create a work entry with a key point first.
    let workCreated = false;
    let keyPointCreated = false;
    const workId = 401;
    const keyPointId = 501;

    await mockApiMethods(page, `**/api/resume/${resumeId}/work_experiences`, {
        GET: { status: 200, body: [] },
        POST: {
            status: 201,
            body: {
                id: workId,
                job_title: 'Engineer',
                company_name: 'Co',
                start_date: '2020-01-01',
                end_date: '',
                description: '',
                display_order: 1,
                active: true,
                created_at: '',
                updated_at: ''
            },
            callback: () => {
                workCreated = true;
            }
        }
    });

    await mockApiMethods(page, `**/api/resume/${resumeId}/work_experiences/*/key_points`, {
        POST: {
            status: 201,
            body: {
                id: keyPointId,
                work_experience_id: workId,
                key_point: 'Shipped feature',
                display_order: 1,
                active: true,
                created_at: '',
                updated_at: ''
            },
            callback: () => {
                keyPointCreated = true;
            }
        }
    });

    await page.getByRole('tab', { name: 'Work', exact: true }).click();
    await page.getByRole('textbox', { name: 'Job title' }).fill('Engineer');
    await page.getByRole('textbox', { name: 'Company' }).fill('Co');
    const workPanel = page.locator('#panel-work');
    await workPanel.getByLabel('Start date year').selectOption('2020');
    await workPanel.getByLabel('Start date month').selectOption('1');
    await workPanel.getByLabel('Start date day').selectOption('1');
    await page.getByRole('button', { name: 'Add work experience', exact: true }).click();

    await page.getByRole('button', { name: 'Engineer — Co' }).click();
    await page.getByRole('group', { name: 'Work experience' }).getByRole('textbox', { name: 'Add key point' }).fill('Shipped feature');
    await page.getByRole('group', { name: 'Work experience' }).getByRole('button', { name: 'Add', exact: true }).click();

    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('All changes saved successfully!')).toBeVisible();
    expect(workCreated).toBe(true);
    expect(keyPointCreated).toBe(true);
    await closeSavePopup(page);

    // Re-expand after save converts the temp id to a real id, which resets collapse state.
    await page.getByRole('button', { name: 'Engineer — Co' }).click();

    // Now delete both and track the order of DELETE requests.
    const deleteOrder: string[] = [];

    await mockApiMethods(page, `**/api/work_experiences/${workId}`, {
        DELETE: {
            status: 204,
            body: {},
            callback: () => { deleteOrder.push('work'); }
        }
    });
    await mockApiMethods(page, `**/api/work_experience_key_points/${keyPointId}`, {
        DELETE: {
            status: 204,
            body: {},
            callback: () => { deleteOrder.push('keyPoint'); }
        }
    });

    await page.getByRole('group', { name: 'Work experience key point' }).getByRole('button', { name: 'Delete', exact: true }).click();
    await page.getByRole('group', { name: 'Work experience' }).getByRole('button', { name: 'Delete', exact: true }).first().click();

    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('All changes saved successfully!')).toBeVisible();
    expect(deleteOrder).toEqual(['keyPoint', 'work']);
});
