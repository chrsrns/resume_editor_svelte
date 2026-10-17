import { test, expect } from '@playwright/test';
import { mockApiResponse, setAuthToken } from './mocks';
import type { Resume } from '$lib/types';

const user = {
    id: 1,
    email: 'owner@example.com',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
};

const baseResume: Resume = {
    id: 'r1',
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
    visibility: 'public',
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

function variant(id: string, overrides: Partial<Resume>): Resume {
    return {
        ...baseResume,
        id,
        is_variant: true,
        base_resume_id: 'r1',
        show_variant_tag: true,
        ...overrides
    };
}

const variants: Resume[] = [
    variant('v1', { company_name: 'Initech', target_date: '2026-04-02' }),
    variant('v2', { company_name: 'Acme', target_date: '2026-03' }),
    variant('v3', { company_name: 'Umbrella', target_date: '2026-01' }),
    variant('v4', { company_name: 'Globex', target_date: '2025' })
];

const secondBase: Resume = {
    ...baseResume,
    id: 'r8',
    name: 'Acme Handbook'
};

const orphanVariant: Resume = {
    ...variant('o1', { name: 'Acme Orphan', company_name: null, variant_label: null }),
    base_resume_id: null
};

async function mockList(page: import('@playwright/test').Page, resumes: Resume[]) {
    await setAuthToken(page);
    await mockApiResponse(page, '**/api/auth/me', 200, user);
    await mockApiResponse(page, '**/api/resumes', 200, resumes);
}

test('show all toggles to show fewer and restores truncation', async ({ page }) => {
    await mockList(page, [baseResume, ...variants]);
    await page.goto('/resume_editor/resumes');
    await page.waitForLoadState('networkidle');

    const variantLinks = page.locator('.variantList a.variantLink');
    await expect(variantLinks).toHaveCount(3);

    await page.getByRole('button', { name: 'Show all (4)…' }).click();
    await expect(variantLinks).toHaveCount(4);
    await expect(page.getByRole('button', { name: 'Show fewer' })).toBeVisible();

    await page.getByRole('button', { name: 'Show fewer' }).click();
    await expect(variantLinks).toHaveCount(3);
    await expect(page.getByRole('button', { name: 'Show all (4)…' })).toBeVisible();
});

test('expanded variant list is scroll-capped at 20rem', async ({ page }) => {
    await mockList(page, [baseResume, ...variants]);
    await page.goto('/resume_editor/resumes');
    await page.waitForLoadState('networkidle');

    const list = page.locator('.variantList');
    await expect(list).not.toHaveClass(/scrollable/);

    await page.getByRole('button', { name: 'Show all (4)…' }).click();
    await expect(list).toHaveClass(/scrollable/);
    await expect(list).toHaveCSS('overflow-y', 'auto');
    await expect(list).toHaveCSS('max-height', '320px');
});

test('search filters to matching variant rows under their base', async ({ page }) => {
    await mockList(page, [baseResume, ...variants, secondBase]);
    await page.goto('/resume_editor/resumes');
    await page.waitForLoadState('networkidle');

    await page.getByLabel('Search resumes').fill('acme');

    const group = page.locator('.variantGroup').filter({ hasText: 'Base Resume' });
    const variantLinks = group.locator('.variantList a.variantLink');
    await expect(variantLinks).toHaveCount(1);
    await expect(variantLinks.nth(0)).toContainText('Acme');

    await expect(page.getByText('4 variants')).toBeVisible();
    await expect(page.getByRole('button', { name: /Show all/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Show fewer' })).toHaveCount(0);

    const matchedBase = page.locator('.variantGroup').filter({ hasText: 'Acme Handbook' });
    await expect(matchedBase).toBeVisible();
    await expect(
        matchedBase.getByRole('button', { name: 'Toggle variants for Acme Handbook' })
    ).toHaveCount(0);
    await expect(matchedBase.locator('.variantList')).toHaveCount(0);
});

test('search matches orphan rows and hides non-matching groups', async ({ page }) => {
    await mockList(page, [baseResume, ...variants, orphanVariant]);
    await page.goto('/resume_editor/resumes');
    await page.waitForLoadState('networkidle');

    await page.getByLabel('Search resumes').fill('orphan');

    await expect(page.getByRole('link', { name: /Acme Orphan/ })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Base Resume' })).toHaveCount(0);
});

test('search shows an explicit empty state on zero matches', async ({ page }) => {
    await mockList(page, [baseResume, ...variants]);
    await page.goto('/resume_editor/resumes');
    await page.waitForLoadState('networkidle');

    await page.getByLabel('Search resumes').fill('zzz');

    await expect(page.getByText('No resumes match "zzz".')).toBeVisible();
    await expect(page.locator('.variantGroup')).toHaveCount(0);
});

test('disclosure toggle still works while a query is active', async ({ page }) => {
    await mockList(page, [baseResume, ...variants]);
    await page.goto('/resume_editor/resumes');
    await page.waitForLoadState('networkidle');

    await page.getByLabel('Search resumes').fill('acme');

    const disclosure = page.getByRole('button', { name: 'Toggle variants for Base Resume' });
    await expect(disclosure).toBeVisible();
    await disclosure.click();
    await expect(disclosure).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('.variantList a.variantLink')).toHaveCount(0);
    await disclosure.click();
    await expect(page.locator('.variantList a.variantLink')).toHaveCount(1);
});

test('clearing the search restores truncation and the show-all control', async ({ page }) => {
    await mockList(page, [baseResume, ...variants]);
    await page.goto('/resume_editor/resumes');
    await page.waitForLoadState('networkidle');

    await page.getByLabel('Search resumes').fill('acme');
    await expect(page.locator('.variantList a.variantLink')).toHaveCount(1);

    await page.getByLabel('Search resumes').fill('');
    await expect(page.locator('.variantList a.variantLink')).toHaveCount(3);
    await expect(page.getByRole('button', { name: 'Show all (4)…' })).toBeVisible();
});
