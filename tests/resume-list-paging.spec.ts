import { test, expect } from '@playwright/test';
import { mockApiResponse, setAuthToken } from './mocks';
import type { Resume } from '$lib/types';

const user = {
    id: 1,
    email: 'owner@example.com',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
};

const resume = (id: string, name: string): Resume => ({
    id,
    name,
    profile_image_url: null,
    location: null,
    email: `${id}@example.com`,
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
});

test('grouped page renders a variant nested under its base', async ({ page }) => {
    const base = resume('b1', 'Base Resume');
    const variantRow: Resume = {
        ...resume('v1', 'Tailored Variant'),
        is_variant: true,
        base_resume_id: 'b1',
        show_variant_tag: true,
        company_name: 'Acme'
    };

    await setAuthToken(page);
    await mockApiResponse(page, '**/api/auth/me', 200, user);
    await mockApiResponse(page, /\/api\/resumes(\?.*)?$/, 200, {
        items: [{ base, variants: [variantRow] }],
        total: 1,
        limit: 20,
        offset: 0
    });

    await page.goto('/resume_editor/resumes');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('link', { name: 'Base Resume' })).toBeVisible();
    await expect(page.getByText('1 variant')).toBeVisible();
    await expect(page.locator('.variantList a.variantLink')).toHaveCount(1);
});

test('pager requests the next window and reports the indicator', async ({ page }) => {
    const rows = Array.from({ length: 21 }, (_, i) => resume(`r${i}`, `Resume ${i}`));
    const requests: string[] = [];

    await setAuthToken(page);
    await mockApiResponse(page, '**/api/auth/me', 200, user);
    await page.route(/\/api\/resumes(\?.*)?$/, async (route) => {
        const url = new URL(route.request().url());
        requests.push(url.search);
        const offset = Number(url.searchParams.get('offset') ?? '0');
        const pageRows = rows.slice(offset, offset + 20);
        const baseIds = new Set(rows.filter((r) => !r.is_variant).map((r) => r.id));
        const items = pageRows
            .filter(
                (r) => !r.is_variant || r.base_resume_id === null || !baseIds.has(r.base_resume_id)
            )
            .map((r) => ({ base: r, variants: [] }));
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                body: { items, total: rows.length, limit: 20, offset }
            })
        });
    });

    await page.goto('/resume_editor/resumes');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('1–20 of 21')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Resume 20' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('21–21 of 21')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Resume 20' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();

    await page.getByRole('button', { name: 'Previous' }).click();
    await expect(page.getByText('1–20 of 21')).toBeVisible();

    expect(requests.some((q) => q.includes('offset=20'))).toBe(true);
});

test('search and sort controls send query params verbatim', async ({ page }) => {
    const requests: string[] = [];

    await setAuthToken(page);
    await mockApiResponse(page, '**/api/auth/me', 200, user);
    await page.route(/\/api\/resumes(\?.*)?$/, async (route) => {
        const url = new URL(route.request().url());
        requests.push(url.search);
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                body: { items: [], total: 0, limit: 20, offset: 0 }
            })
        });
    });

    await page.goto('/resume_editor/resumes');
    await page.waitForLoadState('networkidle');

    await page.getByLabel('Search resumes').fill('acme corp');
    await expect(page.getByText('No resumes match "acme corp".')).toBeVisible();

    await page.getByLabel('Sort field').selectOption('name');
    await page.getByLabel('Sort order').selectOption('desc');

    await expect.poll(() => requests.some((q) => q.includes('search=acme'))).toBe(true);
    await expect
        .poll(() => requests.some((q) => q.includes('sort=name') && q.includes('order=desc')))
        .toBe(true);
});

test('an empty page beyond total renders the zero-window indicator and empty state', async ({
    page
}) => {
    await setAuthToken(page);
    await mockApiResponse(page, '**/api/auth/me', 200, user);
    await page.route(/\/api\/resumes(\?.*)?$/, async (route) => {
        const url = new URL(route.request().url());
        const offset = Number(url.searchParams.get('offset') ?? '0');
        const rows = Array.from({ length: 30 }, (_, i) => resume(`r${i}`, `Resume ${i}`));
        const items = rows.slice(offset, offset + 20).map((r) => ({ base: r, variants: [] }));
        // after the first window loads, the total shrinks below the current offset
        const shrunken = offset >= 20;
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                body: {
                    items: shrunken ? [] : items,
                    total: shrunken ? 10 : rows.length,
                    limit: 20,
                    offset
                }
            })
        });
    });

    await page.goto('/resume_editor/resumes');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('1–20 of 30')).toBeVisible();

    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('0–0 of 10')).toBeVisible();
    await expect(page.getByText('No resumes found.')).toBeVisible();
});
