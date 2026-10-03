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

async function mockEmptySections(page: import('@playwright/test').Page, id: number) {
    await mockApiResponse(page, `**/api/resume/${id}/education`, 200, []);
    await mockApiResponse(page, `**/api/resume/${id}/work_experiences`, 200, []);
    await mockApiResponse(page, `**/api/resume/${id}/skills`, 200, []);
    await mockApiResponse(page, `**/api/resume/${id}/portfolio_projects`, 200, []);
    await mockApiResponse(page, `**/api/resume/${id}/languages`, 200, []);
}

async function openNewVariantPage(page: import('@playwright/test').Page, base = baseResume) {
    await setAuthToken(page);
    await mockApiResponse(page, '**/api/auth/me', 200, user);
    await mockApiResponse(page, `**/api/resume/${base.id}`, 200, base);
    await page.goto(`/resume_editor/resumes/${base.id}/variants/new`);
    await expect(page.getByRole('heading', { name: 'New variant' })).toBeVisible();
}

test('new variant redirects unauthenticated users', async ({ page }) => {
    await page.goto('/resume_editor/resumes/1/variants/new');
    await expect(page).toHaveURL('/resume_editor/auth/login');
});

test('new variant forbids non-owner', async ({ page }) => {
    const otherUser = { ...user, id: 2, email: 'other@example.com' };
    await setAuthToken(page);
    await mockApiResponse(page, '**/api/auth/me', 200, otherUser);
    await mockApiResponse(page, '**/api/resume/1', 200, baseResume);

    await page.goto('/resume_editor/resumes/1/variants/new');

    await expect(page.getByText('Forbidden')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create variant' })).toHaveCount(0);
});

test('new variant initializes visibility and submits normalized metadata with auth', async ({
    page
}) => {
    const privateBase = { ...baseResume, is_public: false };
    await openNewVariantPage(page, privateBase);

    await expect(page.getByText(`Copy of ${privateBase.name}`)).toBeVisible();
    await expect(page.getByRole('checkbox', { name: 'Public' })).not.toBeChecked();
    await expect(page.getByRole('checkbox', { name: 'Show variant tag' })).toBeChecked();
    await expect(page.getByText(/cannot see the base/)).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Name' })).toHaveCount(0);

    await page.getByRole('textbox', { name: 'Company' }).fill('  Acme  ');
    await page.getByRole('textbox', { name: 'Role / title' }).fill(' Backend Engineer ');
    await page.getByLabel('Target date year').selectOption('2026');
    await page.getByLabel('Target date month').selectOption('3');
    await page.getByRole('textbox', { name: 'Label' }).fill(' Backend ');
    await page.getByRole('textbox', { name: 'Job description' }).fill(' Build systems ');
    await page.getByRole('checkbox', { name: 'Public' }).check();
    await page.getByRole('checkbox', { name: 'Show variant tag' }).uncheck();

    let createBody: Record<string, unknown> | null = null;
    let authHeader: string | null = null;
    await mockApiMethods(page, '**/api/resume/1/variants', {
        POST: {
            status: 201,
            body: variantResume,
            callback: async (req) => {
                authHeader = req.headers()['authorization'] ?? null;
                createBody = await req.postDataJSON();
            }
        }
    });
    await mockApiResponse(page, '**/api/resume/2', 200, variantResume);
    await mockEmptySections(page, 2);

    await page.getByRole('button', { name: 'Create variant' }).click();

    await expect(page).toHaveURL('/resume_editor/resumes/2/edit');
    expect(createBody).toEqual({
        company_name: 'Acme',
        role_title: 'Backend Engineer',
        target_date: '2026-03',
        job_description: 'Build systems',
        variant_label: 'Backend',
        is_public: true,
        show_variant_tag: false
    });
    expect(authHeader).toBe('Bearer test-token');
});

test('new variant initializes Public from a public base', async ({ page }) => {
    await openNewVariantPage(page, { ...baseResume, is_public: true });

    await expect(page.getByRole('checkbox', { name: 'Public' })).toBeChecked();
});

test('new variant cancel returns to base', async ({ page }) => {
    await openNewVariantPage(page);
    await mockApiResponse(page, '**/api/resume/1', 200, baseResume);
    await mockEmptySections(page, 1);

    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page).toHaveURL('/resume_editor/resumes/1');
});

test('new variant surfaces create failure', async ({ page }) => {
    await openNewVariantPage(page);
    await mockApiMethods(page, '**/api/resume/1/variants', {
        POST: { status: 403, body: 'Cannot create a variant for this resume' }
    });

    await page.getByRole('button', { name: 'Create variant' }).click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Cannot create a variant for this resume')).toBeVisible();
    await expect(page).toHaveURL('/resume_editor/resumes/1/variants/new');

    await page.getByRole('dialog').getByRole('button', { name: 'Close' }).last().click();
    await expect(page.getByRole('button', { name: 'Create variant' })).toBeEnabled();
});

async function openVariantEditPage(
    page: import('@playwright/test').Page,
    resume = variantResume
) {
    await setAuthToken(page);
    await mockApiResponse(page, '**/api/auth/me', 200, user);
    await mockApiResponse(page, `**/api/resume/${resume.id}`, 200, resume);
    await mockEmptySections(page, resume.id);
    await page.goto(`/resume_editor/resumes/${resume.id}/edit`);
    await expect(page.getByText('Edit resume')).toBeVisible();
}

test('edit variant updates targeting metadata and omits email', async ({ page }) => {
    await openVariantEditPage(page);

    await expect(page.getByText('Variant targeting')).toBeVisible();
    await page.getByRole('textbox', { name: 'Company' }).fill(' NewCo ');
    await page.getByRole('textbox', { name: 'Role / title' }).fill(' Staff Engineer ');
    await page.getByLabel('Target date month').selectOption('5');
    await page.getByRole('textbox', { name: 'Label' }).fill(' Application ');
    await page.getByRole('textbox', { name: 'Job description' }).fill(' Updated JD ');

    let updateBody: Record<string, unknown> | null = null;
    await mockApiMethods(page, `**/api/resume/${variantResume.id}`, {
        PUT: {
            status: 200,
            body: variantResume,
            callback: async (req) => {
                updateBody = await req.postDataJSON();
            }
        }
    });

    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('All changes saved successfully!')).toBeVisible();

    expect(updateBody).toMatchObject({
        company_name: 'NewCo',
        role_title: 'Staff Engineer',
        target_date: '2026-05',
        job_description: 'Updated JD',
        variant_label: 'Application',
        show_variant_tag: true
    });
    expect(updateBody).not.toHaveProperty('email');
    expect(updateBody).not.toHaveProperty('is_variant');
    expect(updateBody).not.toHaveProperty('base_resume_id');
    expect(updateBody).not.toHaveProperty('target_date_precision');
});
