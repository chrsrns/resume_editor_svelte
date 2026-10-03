import { test, expect } from '@playwright/test';
import { mockApiMethods, mockApiResponse, setAuthToken } from './mocks';
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
    created_by: 1,
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

test('variant API helpers call create and list endpoints with auth', async ({ page }) => {
    await setAuthToken(page);
    await mockApiResponse(page, '**/api/auth/me', 200, user);
    await mockApiResponse(page, '**/api/resumes', 200, []);

    let createAuthHeader: string | null = null;
    let listAuthHeader: string | null = null;
    let createBody: unknown = null;

    await mockApiMethods(page, '**/api/resume/1/variants', {
        GET: {
            status: 200,
            body: [variantResume],
            callback: (req) => {
                listAuthHeader = req.headers()['authorization'] ?? null;
            }
        },
        POST: {
            status: 201,
            body: variantResume,
            callback: async (req) => {
                createAuthHeader = req.headers()['authorization'] ?? null;
                createBody = await req.postDataJSON();
            }
        }
    });

    await page.goto('/resume_editor/resumes');
    await page.waitForLoadState('networkidle');

    const result = await page.evaluate(async () => {
        const moduleUrl = '/resume_editor/src/lib/api/resumes.ts';
        const api = (await import(moduleUrl)) as {
            createVariant: (id: number, data: { company_name?: string }) => Promise<Resume>;
            listVariants: (id: number) => Promise<Resume[]>;
        };
        const created = await api.createVariant(1, { company_name: 'Acme' });
        const variants = await api.listVariants(1);
        return { created, variants };
    });

    expect(result.created).toMatchObject({ id: 2, is_variant: true });
    expect(result.variants).toHaveLength(1);
    expect(createBody).toEqual({ company_name: 'Acme' });
    expect(createAuthHeader).toBe('Bearer test-token');
    expect(listAuthHeader).toBe('Bearer test-token');
});
