import { test, expect, type Page } from '@playwright/test';
import { mockApiResponse, setAuthToken, resumeListPage } from './mocks';
import type { Resume, Visibility } from '../src/lib/types';

const resumeId = 'r1';
const resumeUrl = `**/api/resume/${resumeId}`;

const user = {
    id: 1,
    email: 'owner@example.com',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
};

function resume(overrides: Partial<Resume> = {}): Resume {
    return {
        id: resumeId,
        name: 'Test Resume',
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
        visibility: 'public',
        is_variant: false,
        base_resume_id: null,
        show_variant_tag: null,
        company_name: null,
        role_title: null,
        target_date: null,
        target_date_precision: null,
        job_description: null,
        variant_label: null,
        ...overrides
    };
}

async function mockEmptySections(page: Page, id: string) {
    await mockApiResponse(page, `**/api/resume/${id}/education`, 200, []);
    await mockApiResponse(page, `**/api/resume/${id}/work_experiences`, 200, []);
    await mockApiResponse(page, `**/api/resume/${id}/skills`, 200, []);
    await mockApiResponse(page, `**/api/resume/${id}/portfolio_projects`, 200, []);
    await mockApiResponse(page, `**/api/resume/${id}/languages`, 200, []);
}

async function openEditPage(page: Page, current: Resume) {
    await setAuthToken(page);
    await mockApiResponse(page, '**/api/auth/me', 200, user);
    await mockApiResponse(page, `**/api/resume/${current.id}`, 200, current);
    await mockEmptySections(page, current.id);
    await page.goto(`/resume_editor/resumes/${current.id}/edit`);
    await expect(page.getByText('Edit resume')).toBeVisible();
}

async function openDetailPage(page: Page, current: Resume, loggedIn = true) {
    if (loggedIn) {
        await setAuthToken(page);
    }
    await mockApiResponse(page, '**/api/auth/me', 200, loggedIn ? user : null);
    await mockApiResponse(page, `**/api/resume/${current.id}`, 200, current);
    await mockEmptySections(page, current.id);
    await page.goto(`/resume_editor/resumes/${current.id}`);
    await expect(page.getByRole('heading', { name: current.name })).toBeVisible();
}

for (const visibility of ['private', 'unlisted', 'public'] as Visibility[]) {
    test(`edit saves visibility ${visibility}`, async ({ page }) => {
        const baseline: Visibility = visibility === 'private' ? 'public' : 'private';
        await openEditPage(page, resume({ visibility: baseline }));

        const label =
            visibility === 'private'
                ? 'Private'
                : visibility === 'unlisted'
                  ? 'Unlisted'
                  : 'Public';
        const radio = page.getByRole('radio', { name: label });
        await radio.check();
        await expect(radio).toBeChecked();

        let putBody: Record<string, unknown> | null = null;
        await page.route(resumeUrl, async (route) => {
            if (route.request().method() === 'PUT') {
                putBody = (await route.request().postDataJSON()) as Record<string, unknown> | null;
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ body: resume({ visibility }) })
                });
                return;
            }
            await route.fallback();
        });

        await page.getByRole('button', { name: 'Save', exact: true }).click();
        await expect(page.getByText('All changes saved successfully!')).toBeVisible();
        expect(putBody).not.toBeNull();
        expect(putBody?.['visibility']).toBe(visibility);
        expect(putBody).not.toHaveProperty('is_public');
    });
}

test('new resume defaults to Private visibility', async ({ page }) => {
    await setAuthToken(page);
    await mockApiResponse(page, '**/api/auth/me', 200, user);
    await page.goto('/resume_editor/resumes/new');
    await page.waitForLoadState('networkidle');

    const privateRadio = page.getByRole('radio', { name: 'Private' });
    await expect(privateRadio).toBeChecked();
    await expect(page.getByRole('radio', { name: 'Unlisted' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Public' })).toBeVisible();

    let postBody: Record<string, unknown> | null = null;
    await page.route('**/api/new_resume', async (route) => {
        if (route.request().method() === 'POST') {
            postBody = (await route.request().postDataJSON()) as Record<string, unknown> | null;
            await route.fulfill({
                status: 201,
                contentType: 'application/json',
                body: JSON.stringify({ body: resume({ visibility: 'private' }) })
            });
            return;
        }
        await route.fallback();
    });
    await mockEmptySections(page, resumeId);
    await mockApiResponse(page, resumeUrl, 200, resume({ visibility: 'private' }));

    await page.getByRole('textbox', { name: 'Name' }).fill('New Resume');
    await page.getByRole('textbox', { name: 'Email' }).fill('new@example.com');
    await page.getByRole('button', { name: 'Create', exact: true }).click();

    expect(postBody).not.toBeNull();
    expect(postBody?.['visibility']).toBe('private');
    expect(postBody).not.toHaveProperty('is_public');
});

test('unlisted resume shows Unlisted tag in own list and detail', async ({ page }) => {
    const unlisted = resume({ visibility: 'unlisted' });
    await setAuthToken(page);
    await mockApiResponse(page, '**/api/auth/me', 200, user);
    await mockApiResponse(page, /\/api\/resumes(\?.*)?$/, 200, resumeListPage([unlisted]));

    await page.goto('/resume_editor/resumes');
    const row = page.getByRole('link', { name: /Test Resume/ });
    await expect(row).toBeVisible();
    await expect(row.getByText('Unlisted')).toBeVisible();

    await openDetailPage(page, unlisted);
    await expect(page.getByText('Unlisted')).toBeVisible();
});

test('unlisted and public resumes are readable anonymously', async ({ page }) => {
    for (const visibility of ['unlisted', 'public'] as Visibility[]) {
        await openDetailPage(page, resume({ visibility }), false);
        await expect(page.getByText('Resume not found or is private')).not.toBeVisible();
    }
});

test('private resume detail shows dedicated not-found copy', async ({ page }) => {
    await setAuthToken(page);
    await mockApiResponse(page, '**/api/auth/me', 200, user);
    await page.route(resumeUrl, async (route) => {
        await route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({ body: 'Not found' })
        });
    });

    await page.goto(`/resume_editor/resumes/${resumeId}`);
    await expect(page.getByText('Resume not found or is private')).toBeVisible();
    await expect(page.getByText('Request failed')).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Retry' })).not.toBeVisible();
});
