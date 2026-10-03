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

const variants: Resume[] = [
    {
        ...variantResume,
        id: 2,
        company_name: 'Acme',
        role_title: 'Engineer',
        target_date: '2026-03',
        variant_label: 'Platform'
    },
    {
        ...variantResume,
        id: 3,
        company_name: 'Globex',
        role_title: 'Designer',
        target_date: null,
        target_date_precision: null,
        variant_label: 'Late'
    },
    {
        ...variantResume,
        id: 4,
        company_name: 'Initech',
        role_title: 'Lead',
        target_date: '2026-04-02',
        target_date_precision: 'day',
        variant_label: 'Priority'
    },
    {
        ...variantResume,
        id: 5,
        company_name: 'Umbrella',
        role_title: 'Researcher',
        target_date: '2025',
        target_date_precision: 'year',
        variant_label: 'Archive'
    }
];

const orphanVariant: Resume = {
    ...variantResume,
    id: 6,
    name: 'Orphan Resume',
    is_variant: true,
    base_resume_id: null,
    show_variant_tag: null,
    company_name: 'Hidden Base Co',
    role_title: 'Secret Role',
    target_date: '2027',
    target_date_precision: 'year',
    variant_label: 'Hidden Base'
};

const otherBase: Resume = {
    ...baseResume,
    id: 7,
    name: 'Other Base',
    created_by: 2
};

test('list groups variants under owned base and supports truncation', async ({ page }) => {
    await setAuthToken(page);
    await mockApiResponse(page, '**/api/auth/me', 200, user);
    await mockApiResponse(page, '**/api/resumes', 200, [
        baseResume,
        otherBase,
        orphanVariant,
        variants[0],
        variants[1],
        variants[2],
        variants[3]
    ]);

    await page.goto('/resume_editor/resumes');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('link', { name: 'Base Resume' })).toHaveAttribute(
        'href',
        '/resume_editor/resumes/1'
    );
    await expect(page.getByText('4 variants')).toBeVisible();
    await expect(page.getByRole('link', { name: 'New variant' })).toHaveAttribute(
        'href',
        '/resume_editor/resumes/1/variants/new'
    );

    const disclosure = page.getByRole('button', { name: 'Toggle variants for Base Resume' });
    await expect(disclosure).toHaveAttribute('aria-expanded', 'true');

    const variantLinks = page.locator('.variantList a.variantLink');
    await expect(variantLinks).toHaveCount(3);
    await expect(variantLinks.nth(0)).toContainText('Initech');
    await expect(variantLinks.nth(1)).toContainText('Acme');
    await expect(variantLinks.nth(2)).toContainText('Umbrella');
    await expect(page.getByRole('link', { name: /Globex/ })).toHaveCount(0);

    const showAll = page.getByRole('button', { name: 'Show all (4)…' });
    await expect(showAll).toBeVisible();
    await showAll.click();
    await expect(variantLinks).toHaveCount(4);
    await expect(variantLinks.nth(3)).toContainText('Globex');

    await disclosure.click();
    await expect(disclosure).toHaveAttribute('aria-expanded', 'false');
    await expect(variantLinks).toHaveCount(0);
    await expect(page).toHaveURL('/resume_editor/resumes');

    await disclosure.press('Enter');
    await expect(disclosure).toHaveAttribute('aria-expanded', 'true');
    await expect(variantLinks).toHaveCount(4);

    await disclosure.press('Space');
    await expect(disclosure).toHaveAttribute('aria-expanded', 'false');
    await expect(variantLinks).toHaveCount(0);
    await expect(page).toHaveURL('/resume_editor/resumes');

    const orphanLink = page.getByRole('link', { name: /Orphan Resume/ });
    await expect(orphanLink).toHaveAttribute('href', '/resume_editor/resumes/6');
    await expect(orphanLink.getByText('variant', { exact: true })).toBeVisible();
    await expect(orphanLink).not.toContainText('Hidden Base Co');

    await expect(page.getByRole('link', { name: 'Other Base' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'New variant' })).toHaveCount(1);
});

test('list hides owner-only variant count and action from non-owner', async ({ page }) => {
    await mockApiResponse(page, '**/api/auth/me', 200, null);
    await mockApiResponse(page, '**/api/resumes', 200, [baseResume, variants[0]]);

    await page.goto('/resume_editor/resumes');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('link', { name: 'Base Resume' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Acme/ })).toBeVisible();
    await expect(page.getByText(/variants/)).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'New variant' })).toHaveCount(0);
});
