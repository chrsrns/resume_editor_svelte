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

async function openEditPage(
    page: Page,
    sections: {
        skills?: unknown[];
        education?: unknown[];
        work?: unknown[];
        portfolio?: unknown[];
        languages?: unknown[];
    } = {},
    tab?: string
) {
    await setAuthToken(page);
    await mockApiResponse(page, '**/api/auth/me', 200, user);
    await mockApiResponse(page, `**/api/resume/${resumeId}`, 200, resume);
    await mockApiResponse(page, `**/api/resume/${resumeId}/skills`, 200, sections.skills ?? []);
    await mockApiResponse(page, `**/api/resume/${resumeId}/education`, 200, sections.education ?? []);
    await mockApiResponse(page, `**/api/resume/${resumeId}/work_experiences`, 200, sections.work ?? []);
    await mockApiResponse(
        page,
        `**/api/resume/${resumeId}/portfolio_projects`,
        200,
        sections.portfolio ?? []
    );
    await mockApiResponse(page, `**/api/resume/${resumeId}/languages`, 200, sections.languages ?? []);

    const url = tab
        ? `/resume_editor/resumes/${resumeId}/edit?tab=${tab}`
        : `/resume_editor/resumes/${resumeId}/edit`;
    await page.goto(url);
    await waitForApp(page);
}

async function closeSavePopup(page: Page) {
    await page.locator('.popup-header .close-button').click();
}

function extractLastPathId(url: string): number {
    const parts = url.split('/');
    return Number(parts[parts.length - 1]);
}

test('add portfolio project with key point and technology and save', async ({ page }) => {
    await openEditPage(page);

    let projectRequestBody: unknown = null;
    const childUrls: string[] = [];
    const projectId = 201;
    const keyPointId = 301;
    const technologyId = 401;

    await mockApiMethods(page, `**/api/resume/${resumeId}/portfolio_projects`, {
        GET: { status: 200, body: [] },
        POST: {
            status: 201,
            body: {
                id: projectId,
                resume_id: resumeId,
                project_name: 'My Project',
                image_url: null,
                project_link: null,
                source_code_link: null,
                description: null,
                display_order: 1,
                active: true,
                created_at: '',
                updated_at: ''
            },
            callback: async (req) => {
                projectRequestBody = await req.postDataJSON();
            }
        }
    });

    await mockApiMethods(page, `**/api/resume/${resumeId}/portfolio_projects/*/key_points`, {
        POST: {
            status: 201,
            body: {
                id: keyPointId,
                portfolio_project_id: projectId,
                key_point: 'Shipped feature',
                display_order: 1,
                created_at: ''
            },
            callback: (req) => {
                childUrls.push(req.url());
            }
        }
    });

    await mockApiMethods(page, `**/api/resume/${resumeId}/portfolio_projects/*/technologies`, {
        POST: {
            status: 201,
            body: {
                id: technologyId,
                portfolio_project_id: projectId,
                technology_name: 'Svelte',
                display_order: 1,
                created_at: ''
            },
            callback: (req) => {
                childUrls.push(req.url());
            }
        }
    });

    await page.getByRole('tab', { name: 'Portfolio', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Add project' })).toBeDisabled();
    await page.getByRole('textbox', { name: 'Project name' }).fill('My Project');
    await page.getByRole('button', { name: 'Add project' }).click();
    await expect(page.getByRole('button', { name: 'My Project' })).toBeVisible();

    await page.getByRole('button', { name: 'My Project' }).click();
    await page
        .getByRole('group', { name: 'Portfolio project' })
        .getByRole('textbox', { name: 'Add key point' })
        .fill('Shipped feature');
    await page
        .getByRole('group', { name: 'Portfolio project' })
        .getByRole('textbox', { name: 'Add key point' })
        .press('Enter');
    await page
        .getByRole('group', { name: 'Portfolio project' })
        .getByRole('textbox', { name: 'Add technology' })
        .fill('Svelte');
    await page
        .getByRole('group', { name: 'Portfolio project' })
        .getByRole('textbox', { name: 'Add technology' })
        .press('Enter');

    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('All changes saved successfully!')).toBeVisible();

    expect(projectRequestBody).toMatchObject({ project_name: 'My Project' });
    expect(childUrls).toHaveLength(2);
    expect(childUrls.every((u) => u.includes(`/portfolio_projects/${projectId}/`))).toBe(true);
});

test('add language with framework and save', async ({ page }) => {
    await openEditPage(page);

    let languageRequestBody: unknown = null;
    let frameworkUrl: string | null = null;
    const languageId = 201;
    const frameworkId = 301;

    await mockApiMethods(page, `**/api/resume/${resumeId}/languages`, {
        GET: { status: 200, body: [] },
        POST: {
            status: 201,
            body: {
                id: languageId,
                resume_id: resumeId,
                language_name: 'TypeScript',
                display_order: 1,
                created_at: ''
            },
            callback: async (req) => {
                languageRequestBody = await req.postDataJSON();
            }
        }
    });

    await mockApiMethods(page, `**/api/resume/${resumeId}/languages/*/frameworks`, {
        POST: {
            status: 201,
            body: {
                id: frameworkId,
                language_id: languageId,
                framework_name: 'Svelte',
                display_order: 1,
                created_at: ''
            },
            callback: (req) => {
                frameworkUrl = req.url();
            }
        }
    });

    await page.getByRole('tab', { name: 'Languages & Frameworks', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Add language' })).toBeDisabled();
    await page.getByRole('textbox', { name: 'Language' }).fill('TypeScript');
    await page.getByRole('button', { name: 'Add language' }).click();
    await expect(page.getByRole('button', { name: 'TypeScript' })).toBeVisible();

    await page.getByRole('button', { name: 'TypeScript' }).click();
    await page
        .getByRole('group', { name: 'Language' })
        .getByRole('textbox', { name: 'Add framework' })
        .fill('Svelte');
    await page
        .getByRole('group', { name: 'Language' })
        .getByRole('textbox', { name: 'Add framework' })
        .press('Enter');

    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('All changes saved successfully!')).toBeVisible();

    expect(languageRequestBody).toMatchObject({ language_name: 'TypeScript' });
    expect(frameworkUrl).toBe(
        `http://localhost:5173/api/resume/${resumeId}/languages/${languageId}/frameworks`
    );
});

test('delete portfolio project removes key points and technologies before project', async ({
    page
}) => {
    await openEditPage(page);

    const projectId = 201;
    const keyPointId = 301;
    const technologyId = 401;
    const childUrls: string[] = [];

    await mockApiMethods(page, `**/api/resume/${resumeId}/portfolio_projects`, {
        GET: { status: 200, body: [] },
        POST: {
            status: 201,
            body: {
                id: projectId,
                resume_id: resumeId,
                project_name: 'My Project',
                image_url: null,
                project_link: null,
                source_code_link: null,
                description: null,
                display_order: 1,
                active: true,
                created_at: '',
                updated_at: ''
            }
        }
    });

    await mockApiMethods(page, `**/api/resume/${resumeId}/portfolio_projects/*/key_points`, {
        POST: {
            status: 201,
            body: {
                id: keyPointId,
                portfolio_project_id: projectId,
                key_point: 'Shipped feature',
                display_order: 1,
                created_at: ''
            },
            callback: (req) => {
                childUrls.push(req.url());
            }
        }
    });

    await mockApiMethods(page, `**/api/resume/${resumeId}/portfolio_projects/*/technologies`, {
        POST: {
            status: 201,
            body: {
                id: technologyId,
                portfolio_project_id: projectId,
                technology_name: 'Svelte',
                display_order: 1,
                created_at: ''
            },
            callback: (req) => {
                childUrls.push(req.url());
            }
        }
    });

    await page.getByRole('tab', { name: 'Portfolio', exact: true }).click();
    await page.getByRole('textbox', { name: 'Project name' }).fill('My Project');
    await page.getByRole('button', { name: 'Add project' }).click();
    await page.getByRole('button', { name: 'My Project' }).click();
    await page
        .getByRole('group', { name: 'Portfolio project' })
        .getByRole('textbox', { name: 'Add key point' })
        .fill('Shipped feature');
    await page
        .getByRole('group', { name: 'Portfolio project' })
        .getByRole('textbox', { name: 'Add key point' })
        .press('Enter');
    await page
        .getByRole('group', { name: 'Portfolio project' })
        .getByRole('textbox', { name: 'Add technology' })
        .fill('Svelte');
    await page
        .getByRole('group', { name: 'Portfolio project' })
        .getByRole('textbox', { name: 'Add technology' })
        .press('Enter');

    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('All changes saved successfully!')).toBeVisible();
    await closeSavePopup(page);

    expect(childUrls).toHaveLength(2);
    expect(childUrls.every((u) => u.includes(`/portfolio_projects/${projectId}/`))).toBe(true);

    const deleteOrder: string[] = [];
    await mockApiMethods(page, `**/api/portfolio_key_points/${keyPointId}`, {
        DELETE: {
            status: 204,
            body: {},
            callback: () => {
                deleteOrder.push('keyPoint');
            }
        }
    });
    await mockApiMethods(page, `**/api/portfolio_technologies/${technologyId}`, {
        DELETE: {
            status: 204,
            body: {},
            callback: () => {
                deleteOrder.push('technology');
            }
        }
    });
    await mockApiMethods(page, `**/api/portfolio_projects/${projectId}`, {
        DELETE: {
            status: 204,
            body: {},
            callback: () => {
                deleteOrder.push('project');
            }
        }
    });

    await page.getByRole('button', { name: 'My Project' }).click();
    await page
        .getByRole('group', { name: 'Portfolio key point' })
        .getByRole('button', { name: 'Delete', exact: true })
        .click();
    await page
        .getByRole('group', { name: 'Portfolio technology' })
        .getByRole('button', { name: 'Delete', exact: true })
        .click();
    await page
        .getByRole('group', { name: 'Portfolio project' })
        .getByRole('button', { name: 'Delete', exact: true })
        .first()
        .click();

    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('All changes saved successfully!')).toBeVisible();

    expect(deleteOrder).toHaveLength(3);
    expect(deleteOrder[2]).toBe('project');
    expect(deleteOrder).toContain('keyPoint');
    expect(deleteOrder).toContain('technology');
});

test('delete language removes framework before language', async ({ page }) => {
    await openEditPage(page);

    const languageId = 201;
    const frameworkId = 301;
    let frameworkUrl: string | null = null;

    await mockApiMethods(page, `**/api/resume/${resumeId}/languages`, {
        GET: { status: 200, body: [] },
        POST: {
            status: 201,
            body: {
                id: languageId,
                resume_id: resumeId,
                language_name: 'TypeScript',
                display_order: 1,
                created_at: ''
            }
        }
    });

    await mockApiMethods(page, `**/api/resume/${resumeId}/languages/*/frameworks`, {
        POST: {
            status: 201,
            body: {
                id: frameworkId,
                language_id: languageId,
                framework_name: 'Svelte',
                display_order: 1,
                created_at: ''
            },
            callback: (req) => {
                frameworkUrl = req.url();
            }
        }
    });

    await page.getByRole('tab', { name: 'Languages & Frameworks', exact: true }).click();
    await page.getByRole('textbox', { name: 'Language' }).fill('TypeScript');
    await page.getByRole('button', { name: 'Add language' }).click();
    await page.getByRole('button', { name: 'TypeScript' }).click();
    await page
        .getByRole('group', { name: 'Language' })
        .getByRole('textbox', { name: 'Add framework' })
        .fill('Svelte');
    await page
        .getByRole('group', { name: 'Language' })
        .getByRole('textbox', { name: 'Add framework' })
        .press('Enter');

    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('All changes saved successfully!')).toBeVisible();
    await closeSavePopup(page);

    expect(frameworkUrl).toBe(
        `http://localhost:5173/api/resume/${resumeId}/languages/${languageId}/frameworks`
    );

    const deleteOrder: string[] = [];
    await mockApiMethods(page, `**/api/frameworks/${frameworkId}`, {
        DELETE: {
            status: 204,
            body: {},
            callback: () => {
                deleteOrder.push('framework');
            }
        }
    });
    await mockApiMethods(page, `**/api/languages/${languageId}`, {
        DELETE: {
            status: 204,
            body: {},
            callback: () => {
                deleteOrder.push('language');
            }
        }
    });

    await page.getByRole('button', { name: 'TypeScript' }).click();
    await page
        .getByRole('group', { name: 'Framework' })
        .getByRole('button', { name: 'Delete', exact: true })
        .click();
    await page
        .getByRole('group', { name: 'Language' })
        .getByRole('button', { name: 'Delete', exact: true })
        .first()
        .click();

    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('All changes saved successfully!')).toBeVisible();

    expect(deleteOrder).toEqual(['framework', 'language']);
});

test('delete education removes key point before education', async ({ page }) => {
    await openEditPage(page, {}, 'education');

    const educationId = 201;
    const keyPointId = 301;
    let keyPointUrl: string | null = null;

    await mockApiMethods(page, `**/api/resume/${resumeId}/education`, {
        GET: { status: 200, body: [] },
        POST: {
            status: 201,
            body: {
                id: educationId,
                resume_id: resumeId,
                education_stage: 'Bachelor',
                institution_name: 'Uni',
                degree: '',
                start_date: '2020',
                end_date: null,
                description: '',
                display_order: 1,
                active: true,
                created_at: '',
                updated_at: ''
            }
        }
    });

    await mockApiMethods(page, `**/api/resume/${resumeId}/education/*/key_points`, {
        POST: {
            status: 201,
            body: {
                id: keyPointId,
                education_id: educationId,
                key_point: "Dean's list",
                display_order: 1,
                created_at: ''
            },
            callback: (req) => {
                keyPointUrl = req.url();
            }
        }
    });

    await page.getByRole('textbox', { name: 'Stage (e.g. Bachelor)' }).fill('Bachelor');
    await page.getByRole('textbox', { name: 'Institution' }).fill('Uni');
    const educationPanel = page.locator('#panel-education');
    await educationPanel.getByLabel('Start date year').selectOption('2020');
    await page.getByRole('button', { name: 'Add education', exact: true }).click();
    await page.getByRole('button', { name: 'Bachelor — Uni' }).click();
    await page
        .getByRole('group', { name: 'Education' })
        .getByRole('textbox', { name: 'Add key point' })
        .fill("Dean's list");
    await page
        .getByRole('group', { name: 'Education' })
        .getByRole('button', { name: 'Add', exact: true })
        .first()
        .click();

    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('All changes saved successfully!')).toBeVisible();
    await closeSavePopup(page);

    expect(keyPointUrl).toBe(
        `http://localhost:5173/api/resume/${resumeId}/education/${educationId}/key_points`
    );

    const deleteOrder: string[] = [];
    await mockApiMethods(page, `**/api/education_key_points/${keyPointId}`, {
        DELETE: {
            status: 204,
            body: {},
            callback: () => {
                deleteOrder.push('keyPoint');
            }
        }
    });
    await mockApiMethods(page, `**/api/education/${educationId}`, {
        DELETE: {
            status: 204,
            body: {},
            callback: () => {
                deleteOrder.push('education');
            }
        }
    });

    await page.getByRole('button', { name: 'Bachelor — Uni' }).click();
    await page
        .getByRole('group', { name: 'Education key point' })
        .getByRole('button', { name: 'Delete', exact: true })
        .click();
    await page
        .getByRole('group', { name: 'Education' })
        .getByRole('button', { name: 'Delete', exact: true })
        .first()
        .click();

    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('All changes saved successfully!')).toBeVisible();

    expect(deleteOrder).toEqual(['keyPoint', 'education']);
});

test('multi-section save creates skill and education', async ({ page }) => {
    await openEditPage(page);

    let skillCreated = false;
    let educationCreated = false;
    let educationPayload: unknown = null;

    await mockApiMethods(page, `**/api/resume/${resumeId}/skills`, {
        GET: { status: 200, body: [] },
        POST: {
            status: 201,
            body: {
                id: 101,
                resume_id: resumeId,
                skill_name: 'Svelte',
                confidence_percentage: 80,
                display_order: 1,
                created_at: ''
            },
            callback: () => {
                skillCreated = true;
            }
        }
    });

    await mockApiMethods(page, `**/api/resume/${resumeId}/education`, {
        GET: { status: 200, body: [] },
        POST: {
            status: 201,
            body: {
                id: 201,
                resume_id: resumeId,
                education_stage: 'Bachelor',
                institution_name: 'Uni',
                degree: '',
                start_date: '2020',
                end_date: null,
                description: '',
                display_order: 1,
                active: true,
                created_at: '',
                updated_at: ''
            },
            callback: async (req) => {
                educationPayload = await req.postDataJSON();
                educationCreated = true;
            }
        }
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
    await page.getByRole('button', { name: 'Add education', exact: true }).click();

    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('All changes saved successfully!')).toBeVisible();

    expect(skillCreated).toBe(true);
    expect(educationCreated).toBe(true);
    expect(educationPayload).toMatchObject({
        education_stage: 'Bachelor',
        institution_name: 'Uni',
        start_date: '2020'
    });
});

test('reorder existing skills updates display_order on save', async ({ page }) => {
    const skillA = {
        id: 101,
        resume_id: resumeId,
        skill_name: 'Svelte',
        confidence_percentage: 80,
        display_order: 1,
        created_at: ''
    };
    const skillB = {
        id: 102,
        resume_id: resumeId,
        skill_name: 'TypeScript',
        confidence_percentage: 90,
        display_order: 2,
        created_at: ''
    };
    await openEditPage(page, { skills: [skillA, skillB] }, 'skills');

    const updates: { id: number; payload: unknown }[] = [];
    await mockApiMethods(page, '**/api/skills/*', {
        PUT: {
            status: 200,
            body: {
                id: 101,
                resume_id: resumeId,
                skill_name: 'Svelte',
                confidence_percentage: 80,
                display_order: 1,
                created_at: ''
            },
            callback: async (req) => {
                const id = extractLastPathId(req.url());
                const payload = await req.postDataJSON();
                updates.push({ id, payload });
            }
        }
    });

    const panel = page.locator('#panel-skills');
    const firstHandle = panel
        .getByRole('group', { name: 'Skill' })
        .first()
        .getByRole('button', { name: 'Reorder skill' });
    await firstHandle.focus();
    await page.keyboard.press('ArrowDown');

    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('All changes saved successfully!')).toBeVisible();

    expect(updates).toHaveLength(2);
    const byId = Object.fromEntries(updates.map((u) => [u.id, u.payload]));
    expect(byId[101]).toEqual({ display_order: 20 });
    expect(byId[102]).toEqual({ display_order: 10 });
});

test('update existing skill name sends update on save', async ({ page }) => {
    const skillA = {
        id: 101,
        resume_id: resumeId,
        skill_name: 'Svelte',
        confidence_percentage: 80,
        display_order: 1,
        created_at: ''
    };
    const skillB = {
        id: 102,
        resume_id: resumeId,
        skill_name: 'TypeScript',
        confidence_percentage: 90,
        display_order: 2,
        created_at: ''
    };
    await openEditPage(page, { skills: [skillA, skillB] }, 'skills');

    let updateId: number | null = null;
    let updatePayload: unknown = null;
    await mockApiMethods(page, '**/api/skills/*', {
        PUT: {
            status: 200,
            body: {
                id: 101,
                resume_id: resumeId,
                skill_name: 'Updated Svelte',
                confidence_percentage: 80,
                display_order: 1,
                created_at: ''
            },
            callback: async (req) => {
                updateId = extractLastPathId(req.url());
                updatePayload = await req.postDataJSON();
            }
        }
    });

    const panel = page.locator('#panel-skills');
    await panel
        .getByRole('group', { name: 'Skill' })
        .first()
        .getByRole('textbox', { name: 'Skill name' })
        .fill('Updated Svelte');

    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('All changes saved successfully!')).toBeVisible();

    expect(updateId).toBe(101);
    expect(updatePayload).toEqual({ skill_name: 'Updated Svelte' });
});

test('adding and immediately deleting a skill does not create it', async ({ page }) => {
    await openEditPage(page, {}, 'skills');

    await page.getByRole('textbox', { name: 'Skill name' }).first().fill('Svelte');
    await page.getByRole('spinbutton', { name: 'Confidence' }).first().fill('80');
    await page.getByRole('button', { name: 'Add', exact: true }).first().click();

    const panel = page.locator('#panel-skills');
    await panel.getByRole('group', { name: 'Skill' }).getByRole('button', { name: 'Delete' }).click();

    await expect(panel.getByRole('group', { name: 'Skill' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeHidden();
});

test('toggle active state on portfolio project sends update', async ({ page }) => {
    await openEditPage(page);

    const projectId = 201;
    await mockApiMethods(page, `**/api/resume/${resumeId}/portfolio_projects`, {
        GET: { status: 200, body: [] },
        POST: {
            status: 201,
            body: {
                id: projectId,
                resume_id: resumeId,
                project_name: 'My Project',
                image_url: null,
                project_link: null,
                source_code_link: null,
                description: null,
                display_order: 1,
                active: true,
                created_at: '',
                updated_at: ''
            }
        }
    });

    await page.getByRole('tab', { name: 'Portfolio', exact: true }).click();
    await page.getByRole('textbox', { name: 'Project name' }).fill('My Project');
    await page.getByRole('button', { name: 'Add project' }).click();
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('All changes saved successfully!')).toBeVisible();
    await closeSavePopup(page);

    let updatePayload: unknown = null;
    await mockApiMethods(page, `**/api/portfolio_projects/${projectId}`, {
        PUT: {
            status: 200,
            body: {
                id: projectId,
                resume_id: resumeId,
                project_name: 'My Project',
                image_url: null,
                project_link: null,
                source_code_link: null,
                description: null,
                display_order: 1,
                active: false,
                created_at: '',
                updated_at: ''
            },
            callback: async (req) => {
                updatePayload = await req.postDataJSON();
            }
        }
    });

    await page.getByRole('button', { name: 'My Project' }).click();
    await page.getByRole('button', { name: 'Deactivate' }).click();
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('All changes saved successfully!')).toBeVisible();

    expect(updatePayload).toMatchObject({ active: false });
});
