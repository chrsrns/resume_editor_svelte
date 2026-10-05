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
