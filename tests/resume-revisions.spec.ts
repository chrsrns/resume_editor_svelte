import { test, expect, type Page } from '@playwright/test';
import { mockApiResponse, mockApiMethods, setAuthToken } from './mocks';

const resumeId = 'r1';
const base = `/resume_editor/resumes/${resumeId}`;

const owner = {
    id: 1,
    email: 'owner@example.com',
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
};
const otherUser = {
    id: 2,
    email: 'other@example.com',
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
};

const resume = {
    id: resumeId,
    name: 'Test Resume',
    profile_image_url: null,
    location: null,
    email: 'test@example.com',
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

const revisions = [
    {
        revision: 3,
        created_at: '2026-03-02T10:00:00',
        created_by: 1,
        action: 'skills',
        is_restore: false
    },
    {
        revision: 2,
        created_at: '2026-03-01T10:00:00',
        created_by: 1,
        action: 'personalinfo',
        is_restore: true
    },
    {
        revision: 1,
        created_at: '2026-02-28T10:00:00',
        created_by: 1,
        action: 'education',
        is_restore: false
    }
];

const snapshot = {
    schema_version: 1,
    name: 'Snapshot Name',
    profile_image_url: null,
    location: 'Lisbon',
    email: 'snap@example.com',
    github_url: null,
    mobile_number: null,
    executive_summary: null,
    video: null,
    visibility: 'public',
    company_name: null,
    role_title: null,
    target_date: null,
    target_date_precision: null,
    job_description: null,
    variant_label: null,
    show_variant_tag: false,
    education: [
        {
            id: 7,
            education_stage: 'BSc',
            institution_name: 'University of X',
            degree: null,
            start_date: '2020-01',
            end_date: null,
            description: null,
            display_order: 1,
            active: false
        }
    ],
    education_key_points: {
        '7': [{ id: 11, key_point: 'Honors', display_order: 1, active: true }]
    },
    skills: [],
    work_experiences: [],
    work_experience_key_points: {},
    portfolio_projects: [],
    portfolio_key_points: {},
    portfolio_technologies: {},
    languages: [],
    frameworks: {}
};

const revision2 = {
    revision: 2,
    created_at: '2026-03-01T10:00:00',
    created_by: 1,
    action: 'personalinfo',
    is_restore: true,
    snapshot
};

const diff2 = {
    revision: 2,
    changes: [
        { path: '/name', kind: 'changed', before: 'Old Name', after: 'New Name' },
        { path: '/skills/0', kind: 'added', before: null, after: { skill_name: 'Rust' } }
    ]
};

const resumeUrl = new RegExp(`/api/resume/${resumeId}$`);
const revisionsUrl = new RegExp(`/api/resume/${resumeId}/revisions$`);
const rev2Url = new RegExp(`/api/resume/${resumeId}/revisions/2$`);
const rev3Url = new RegExp(`/api/resume/${resumeId}/revisions/3$`);
const diff2Url = new RegExp(`/api/resume/${resumeId}/revisions/2/diff`);
const diff3Url = new RegExp(`/api/resume/${resumeId}/revisions/3/diff`);
const restore2Url = new RegExp(`/api/resume/${resumeId}/revisions/2/restore$`);
const anyRevisionSubUrl = new RegExp(`/api/resume/${resumeId}/revisions/`);

async function mockBase(page: Page) {
    await setAuthToken(page);
    await mockApiResponse(page, '**/api/auth/me', 200, owner);
    await mockApiResponse(page, resumeUrl, 200, resume);
    await mockApiResponse(page, revisionsUrl, 200, revisions);
}

async function mockRevision2(page: Page) {
    await mockApiResponse(page, rev2Url, 200, revision2);
    await mockApiResponse(page, diff2Url, 200, diff2);
}

test.describe('revision history page', () => {
    test('renders the timeline newest first with badges', async ({ page }) => {
        await mockBase(page);
        await page.goto(`${base}/revisions`);

        const rows = page.locator('a.row');
        await expect(rows).toHaveCount(3);
        await expect(rows.nth(0)).toContainText('#3');
        await expect(rows.nth(0)).toContainText('Skills');
        await expect(rows.nth(1)).toContainText('#2');
        await expect(rows.nth(1)).toContainText('Personal info');
        await expect(rows.nth(1)).toContainText('restored');
        await expect(rows.nth(2)).toContainText('#1');
        await expect(rows.nth(2)).toContainText('Education');
    });

    test('client-side nav to another resume on the same route reloads title and timeline', async ({
        page
    }) => {
        const resumeId2 = 'r2';
        await mockBase(page);
        await mockApiResponse(page, new RegExp(`/api/resume/${resumeId2}$`), 200, {
            ...resume,
            id: resumeId2,
            name: 'Other Resume'
        });
        await mockApiResponse(page, new RegExp(`/api/resume/${resumeId2}/revisions$`), 200, [
            {
                revision: 5,
                created_at: '2026-03-05T10:00:00',
                created_by: 1,
                action: 'languages',
                is_restore: false
            }
        ]);
        await page.goto(`${base}/revisions`);
        await expect(page.locator('h1')).toHaveText('Test Resume');
        await expect(page.locator('a.row')).toHaveCount(3);

        await page.evaluate((href) => {
            const anchor = document.createElement('a');
            anchor.href = href;
            document.body.appendChild(anchor);
            anchor.click();
        }, `/resume_editor/resumes/${resumeId2}/revisions`);

        await expect(page).toHaveURL(new RegExp(`/resumes/${resumeId2}/revisions`));
        await expect(page.locator('h1')).toHaveText('Other Resume');
        await expect(page.locator('a.row')).toHaveCount(1);
        await expect(page.locator('a.row').first()).toContainText('#5');
        await expect(page.locator('a.row').first()).toContainText('Languages');
    });

    test('shows the ghost state for an empty chain', async ({ page }) => {
        await setAuthToken(page);
        await mockApiResponse(page, '**/api/auth/me', 200, owner);
        await mockApiResponse(page, resumeUrl, 200, resume);
        await mockApiResponse(page, revisionsUrl, 200, []);
        await page.goto(`${base}/revisions`);

        await expect(page.getByText('No revisions yet')).toBeVisible();
    });

    test('?n= opens the panel with the Changes view', async ({ page }) => {
        await mockBase(page);
        await mockRevision2(page);
        await page.goto(`${base}/revisions?n=2`);

        await expect(page.getByRole('heading', { name: 'Revision #2' })).toBeVisible();
        await expect(page.locator('code.path', { hasText: '/name' })).toBeVisible();
        await expect(page.locator('.kind-changed')).toContainText('changed');
        await expect(page.locator('.kind-added')).toContainText('added');
    });

    test('selecting a row navigates query-only and the toggle switches views', async ({ page }) => {
        await mockBase(page);
        await mockRevision2(page);
        await page.goto(`${base}/revisions`);

        await page.locator('a.row', { hasText: '#2' }).click();
        await expect(page).toHaveURL(new RegExp(`n=2`));
        await expect(page.getByRole('heading', { name: 'Revision #2' })).toBeVisible();

        await page.getByRole('tab', { name: 'State' }).click();
        await expect(page.getByText('Snapshot Name')).toBeVisible();
        await expect(page.getByText('University of X')).toBeVisible();
        await expect(page.getByText('Honors')).toBeVisible();
        await expect(page.getByText('Inactive').first()).toBeVisible();

        await page.getByRole('tab', { name: 'Changes' }).click();
        await expect(page.locator('code.path', { hasText: '/name' })).toBeVisible();
    });

    test('the unified diff is fetched lazily once and toggled without refetch', async ({
        page
    }) => {
        await mockBase(page);
        await mockRevision2(page);
        let unifiedCalls = 0;
        await mockApiMethods(page, diff2Url, {
            GET: {
                status: 200,
                body: { revision: 2, changes: diff2.changes, unified: '- old\n+ new' },
                callback: (request) => {
                    if (request.url().includes('unified=true')) unifiedCalls++;
                }
            }
        });
        await page.goto(`${base}/revisions?n=2`);

        const toggle = page.getByRole('button', { name: 'Show text diff' });
        await toggle.click();
        await expect(page.locator('pre.unified')).toContainText('- old');
        expect(unifiedCalls).toBe(1);

        await page.getByRole('button', { name: 'Hide text diff' }).click();
        await expect(page.locator('pre.unified')).not.toBeVisible();
        await page.getByRole('button', { name: 'Show text diff' }).click();
        await expect(page.locator('pre.unified')).toBeVisible();
        expect(unifiedCalls).toBe(1);
    });

    test('empty changes render the no-recorded-changes state', async ({ page }) => {
        await mockBase(page);
        await mockApiResponse(page, rev2Url, 200, revision2);
        await mockApiResponse(page, diff2Url, 200, { revision: 2, changes: [] });
        await page.goto(`${base}/revisions?n=2`);

        await expect(page.getByText('No recorded changes')).toBeVisible();
    });

    test('malformed or out-of-range ?n walls the panel region without a request', async ({
        page
    }) => {
        await mockBase(page);
        let subRequests = 0;
        await page.route(anyRevisionSubUrl, async (route) => {
            subRequests++;
            await route.fulfill({
                status: 404,
                contentType: 'application/json',
                body: JSON.stringify({ body: 'not found' })
            });
        });

        for (const n of ['1.5', '0x10', '01', '+1', '0', '99', '2147483648']) {
            subRequests = 0;
            await page.goto(`${base}/revisions?n=${n}`);
            await expect(page.getByText('Revision not found')).toBeVisible();
            await expect(page.locator('a.row').first()).toBeVisible();
            expect(subRequests, `n=${n} must not hit the API`).toBe(0);
        }
    });

    test('the close control removes ?n and hides the panel', async ({ page }) => {
        await mockBase(page);
        await mockRevision2(page);
        await page.goto(`${base}/revisions?n=2`);
        await expect(page.getByRole('heading', { name: 'Revision #2' })).toBeVisible();

        await page.getByRole('link', { name: 'Close revision panel' }).click();
        await expect(page).not.toHaveURL(/n=/);
        await expect(page.getByRole('heading', { name: 'Revision #2' })).not.toBeVisible();
        await expect(page.locator('a.row').first()).toBeVisible();
    });

    test('reselecting the active revision does nothing', async ({ page }) => {
        await mockBase(page);
        let revisionFetches = 0;
        await page.route(rev2Url, async (route) => {
            revisionFetches++;
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ body: revision2 })
            });
        });
        await mockApiResponse(page, diff2Url, 200, diff2);
        await page.goto(`${base}/revisions?n=2`);
        await expect(page.getByRole('heading', { name: 'Revision #2' })).toBeVisible();
        expect(revisionFetches).toBe(1);

        await page.locator('a.row', { hasText: '#2' }).click();
        await page.waitForTimeout(100);
        expect(revisionFetches).toBe(1);
        await expect(page.getByRole('heading', { name: 'Revision #2' })).toBeVisible();
    });

    test('redirects to login on a 401', async ({ page }) => {
        await setAuthToken(page);
        await mockApiResponse(page, '**/api/auth/me', 200, owner);
        await mockApiResponse(page, resumeUrl, 200, resume);
        await mockApiResponse(page, revisionsUrl, 401, 'unauthorized');
        await page.goto(`${base}/revisions`);

        await expect(page).toHaveURL(/\/auth\/login/);
    });

    test('redirects to login with no token', async ({ page }) => {
        await page.goto(`${base}/revisions`);
        await expect(page).toHaveURL(/\/auth\/login/);
    });

    test('a private foreign resume renders the inaccessible wall', async ({ page }) => {
        await setAuthToken(page);
        await mockApiResponse(page, '**/api/auth/me', 200, otherUser);
        await mockApiResponse(page, resumeUrl, 404, 'not found');
        await mockApiResponse(page, revisionsUrl, 404, 'not found');
        await page.goto(`${base}/revisions`);

        await expect(page.getByText('Resume not found or is private')).toBeVisible();
        await expect(page.locator('a.row')).toHaveCount(0);
    });

    test('a public foreign resume whose revisions 403 renders the same wall', async ({ page }) => {
        await setAuthToken(page);
        await mockApiResponse(page, '**/api/auth/me', 200, otherUser);
        await mockApiResponse(page, resumeUrl, 200, { ...resume, created_by: 2 });
        await mockApiResponse(page, revisionsUrl, 403, 'forbidden');
        await page.goto(`${base}/revisions`);

        await expect(page.getByText('Resume not found or is private')).toBeVisible();
    });

    test('restore confirms, sends the refetched head, applies the returned title, reloads', async ({
        page
    }) => {
        await mockBase(page);
        await mockRevision2(page);
        await page.goto(`${base}/revisions?n=2`);
        await expect(page.getByRole('heading', { name: 'Revision #2' })).toBeVisible();

        page.on('dialog', (dialog) => void dialog.accept());

        let timelineFetches = 1;
        await page.route(revisionsUrl, async (route) => {
            timelineFetches++;
            const chain = [
                {
                    revision: 4,
                    created_at: '2026-03-03T10:00:00',
                    created_by: 1,
                    action: 'personalinfo',
                    is_restore: true
                },
                ...revisions
            ];
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ body: chain })
            });
        });
        await page.route(restore2Url, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ body: { ...resume, name: 'Restored Name' } })
            });
        });

        const postPromise = page.waitForRequest(restore2Url);
        await page.getByRole('button', { name: 'Restore' }).click();
        const restoreRequest = await postPromise;
        expect(restoreRequest.postDataJSON()).toEqual({ expected_revision: 4 });
        await expect(page.locator('h1')).toContainText('Restored Name');
        await expect(page.locator('a.row')).toHaveCount(4);
        expect(timelineFetches).toBeGreaterThanOrEqual(2);
        await expect(page).toHaveURL(/revisions\?n=2$/);
    });

    test('a 409 on restore opens the error dialog and refreshes the timeline', async ({ page }) => {
        await mockBase(page);
        await mockRevision2(page);
        await page.goto(`${base}/revisions?n=2`);
        await expect(page.getByRole('heading', { name: 'Revision #2' })).toBeVisible();

        page.on('dialog', (dialog) => void dialog.accept());
        let timelineFetches = 0;
        await page.route(revisionsUrl, async (route) => {
            timelineFetches++;
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ body: revisions })
            });
        });
        await mockApiResponse(page, restore2Url, 409, 'stale head');

        await page.getByRole('button', { name: 'Restore' }).click();

        await expect(page.getByRole('dialog')).toBeVisible();
        await expect(page.getByRole('dialog')).toContainText('stale head');
        expect(timelineFetches).toBeGreaterThanOrEqual(2);
    });
});

test.describe('history action on the detail page', () => {
    async function mockDetailSections(page: Page) {
        for (const section of [
            'education',
            'work-experience',
            'portfolio',
            'skills',
            'languages'
        ]) {
            await page.route(new RegExp(`/api/resume/${resumeId}/${section}`), async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ body: [] })
                });
            });
        }
    }

    test('the History action renders for the owner', async ({ page }) => {
        await setAuthToken(page);
        await mockApiResponse(page, '**/api/auth/me', 200, owner);
        await mockApiResponse(page, resumeUrl, 200, resume);
        await mockDetailSections(page);
        await page.goto(base);

        const history = page.getByRole('link', { name: 'History' });
        await expect(history).toBeVisible();
        await history.click();
        await expect(page).toHaveURL(/\/resumes\/r1\/revisions/);
    });

    test('the History action is hidden for non-owners and guests', async ({ page }) => {
        await setAuthToken(page);
        await mockApiResponse(page, '**/api/auth/me', 200, otherUser);
        await mockApiResponse(page, resumeUrl, 200, resume);
        await mockDetailSections(page);
        await page.goto(base);
        await expect(page.getByText('Test Resume')).toBeVisible();
        await expect(page.getByRole('link', { name: 'History' })).toHaveCount(0);
    });
});
