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

const workId = 401;

async function waitForApp(page: Page) {
    await page.waitForLoadState('networkidle');
}

async function mockEmptySections(page: Page) {
    await mockApiResponse(page, `**/api/resume/${resumeId}/education`, 200, []);
    await mockApiResponse(page, `**/api/resume/${resumeId}/skills`, 200, []);
    await mockApiResponse(page, `**/api/resume/${resumeId}/portfolio_projects`, 200, []);
    await mockApiResponse(page, `**/api/resume/${resumeId}/languages`, 200, []);
}

async function openEditPage(page: Page) {
    await setAuthToken(page);
    await mockApiResponse(page, '**/api/auth/me', 200, user);
    await mockApiResponse(page, `**/api/resume/${resumeId}`, 200, resume);
    await mockApiResponse(page, `**/api/resume/${resumeId}/work_experiences`, 200, [
        {
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
        }
    ]);
    await mockApiResponse(page, `**/api/resume/${resumeId}/work_experiences/${workId}/key_points`, 200, []);
    await mockEmptySections(page);

    await page.goto(`/resume_editor/resumes/${resumeId}/edit?tab=work`);
    await waitForApp(page);
}

test('toggling active state sends update on save', async ({ page }) => {
    await openEditPage(page);

    let updateCalled = false;
    let updatePayload: Record<string, unknown> = {};

    await mockApiMethods(page, `**/api/work_experiences/${workId}`, {
        PUT: {
            status: 200,
            body: {
                id: workId,
                job_title: 'Engineer',
                company_name: 'Co',
                start_date: '2020-01-01',
                end_date: '',
                description: '',
                display_order: 1,
                active: false,
                created_at: '',
                updated_at: ''
            },
            callback: async (request) => {
                updateCalled = true;
                updatePayload = await request.postDataJSON();
            }
        }
    });

    await page.getByRole('button', { name: 'Engineer — Co' }).click();
    await page.getByRole('button', { name: 'Active', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Inactive', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('All changes saved successfully!')).toBeVisible();
    expect(updateCalled).toBe(true);
    expect(updatePayload).toMatchObject({ active: false });
});
