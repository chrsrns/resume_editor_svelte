<script lang="ts">
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import { SvelteURLSearchParams } from 'svelte/reactivity';
    import { page } from '$app/state';
    import { resolve } from '$app/paths';
    import { listEducations, listEducationKeyPoints } from '$lib/api/education';
    import { listFrameworks } from '$lib/api/frameworks';
    import { listLanguages } from '$lib/api/languages';
    import {
        listPortfolioKeyPoints,
        listPortfolioProjects,
        listPortfolioTechnologies
    } from '$lib/api/portfolio';
    import { getResume, exportResumeMarkdown } from '$lib/api/resumes';
    import { listSkills } from '$lib/api/skills';
    import { listWorkExperienceKeyPoints, listWorkExperiences } from '$lib/api/work-experience';
    import type { ApiError } from '$lib/api/client';
    import type {
        Education,
        EducationKeyPoint,
        Framework,
        Language,
        PortfolioKeyPoint,
        PortfolioProject,
        PortfolioTechnology,
        Resume,
        Skill,
        WorkExperience,
        WorkExperienceKeyPoint
    } from '$lib/types';
    import { currentUser } from '$lib/session';
    import ResumeViewHeader from '$lib/components/ResumeViewHeader.svelte';
    import IconTabBar from '$lib/components/IconTabBar.svelte';
    import FieldRow from '$lib/components/FieldRow.svelte';
    import ExecutiveSummaryCard from '$lib/components/ExecutiveSummaryCard.svelte';
    import Button from '$lib/components/ui/Button.svelte';
    import ErrorDialog from '$lib/components/ui/ErrorDialog.svelte';
    import Eye from '@lucide/svelte/icons/eye';
    import Mail from '@lucide/svelte/icons/mail';
    import Image from '@lucide/svelte/icons/image';
    import MapPin from '@lucide/svelte/icons/map-pin';
    import Link from '@lucide/svelte/icons/link';
    import Phone from '@lucide/svelte/icons/phone';
    import User from '@lucide/svelte/icons/user';
    import GraduationCap from '@lucide/svelte/icons/graduation-cap';
    import Briefcase from '@lucide/svelte/icons/briefcase';
    import Folder from '@lucide/svelte/icons/folder';
    import Star from '@lucide/svelte/icons/star';
    import Globe from '@lucide/svelte/icons/globe';
    import RefreshCw from '@lucide/svelte/icons/refresh-cw';

    const tabs = [
        { id: 'basics', label: 'Basics' },
        { id: 'education', label: 'Education' },
        { id: 'work', label: 'Work' },
        { id: 'portfolio', label: 'Portfolio' },
        { id: 'skills', label: 'Skills' },
        { id: 'languages', label: 'Languages & Frameworks' }
    ] as const;

    const tabIcons = [
        { id: 'basics', label: 'Basics', Icon: User },
        { id: 'education', label: 'Education', Icon: GraduationCap },
        { id: 'work', label: 'Work', Icon: Briefcase },
        { id: 'portfolio', label: 'Portfolio', Icon: Folder },
        { id: 'skills', label: 'Skills', Icon: Star },
        { id: 'languages', label: 'Languages & Frameworks', Icon: Globe }
    ] as const;

    type TabId = (typeof tabs)[number]['id'];

    function parseTabId(value: string | null): TabId {
        const v = value ?? '';
        const found = tabs.find((t) => t.id === v);
        return found ? found.id : 'basics';
    }

    function byDisplayOrder<T extends { display_order: number | null }>(a: T, b: T): number {
        const ao = a.display_order ?? Number.MAX_SAFE_INTEGER;
        const bo = b.display_order ?? Number.MAX_SAFE_INTEGER;
        if (ao !== bo) return ao - bo;
        return 0;
    }

    let loading = $state(true);
    let sectionLoading = $state(false);
    let error = $state<string | null>(null);
    let sectionError = $state<string | null>(null);
    let resume = $state<Resume | null>(null);
    const activeTab = $derived(parseTabId(page.url.searchParams.get('tab')));

    let educations = $state<Education[]>([]);
    let educationKeyPoints = $state<Record<number, EducationKeyPoint[]>>({});
    let workExperiences = $state<WorkExperience[]>([]);
    let workExperienceKeyPoints = $state<Record<number, WorkExperienceKeyPoint[]>>({});
    let portfolioProjects = $state<PortfolioProject[]>([]);
    let portfolioKeyPoints = $state<Record<number, PortfolioKeyPoint[]>>({});
    let portfolioTechnologies = $state<Record<number, PortfolioTechnology[]>>({});
    let skills = $state<Skill[]>([]);
    let languages = $state<Language[]>([]);
    let frameworks = $state<Record<number, Framework[]>>({});

    let exportErrorOpen = $state(false);
    let exportErrorTitle = $state('Export failed');
    let exportErrorMessage = $state('');

    function onTabListKeydown(e: KeyboardEvent) {
        const tablist = e.currentTarget as HTMLElement | null;
        if (!tablist) return;

        const buttons = Array.from(
            tablist.querySelectorAll<HTMLButtonElement>('button[role="tab"]')
        );
        if (buttons.length === 0) return;

        const focusedIndex = buttons.findIndex((b) => b === document.activeElement);
        const activeIndex = Math.max(
            0,
            tabs.findIndex((t) => t.id === activeTab)
        );
        const idx = focusedIndex >= 0 ? focusedIndex : activeIndex;

        function focusAt(nextIndex: number) {
            const count = buttons.length;
            const next = ((nextIndex % count) + count) % count;
            buttons[next]?.focus();
        }

        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                focusAt(idx - 1);
                break;
            case 'ArrowRight':
                e.preventDefault();
                focusAt(idx + 1);
                break;
            case 'Home':
                e.preventDefault();
                focusAt(0);
                break;
            case 'End':
                e.preventDefault();
                focusAt(buttons.length - 1);
                break;
            case 'Enter':
            case ' ': {
                e.preventDefault();
                const el = document.activeElement as HTMLButtonElement | null;
                const raw = el?.dataset.tab ?? null;
                selectTab(parseTabId(raw));
                break;
            }
        }
    }

    function selectTab(id: string) {
        const params = new SvelteURLSearchParams(page.url.searchParams);
        params.set('tab', id);
        void goto(resolve(`/resumes/${page.params.id}?${params.toString()}`), {
            replaceState: false,
            noScroll: true,
            keepFocus: true
        });
    }

    async function loadSections(id: number) {
        const [educationItems, workItems, portfolioItems, skillItems, languageItems] =
            await Promise.all([
                listEducations(id),
                listWorkExperiences(id),
                listPortfolioProjects(id),
                listSkills(id),
                listLanguages(id)
            ]);

        educations = [...educationItems].sort(byDisplayOrder);
        workExperiences = [...workItems].sort(byDisplayOrder);
        portfolioProjects = [...portfolioItems].sort(byDisplayOrder);
        skills = [...skillItems].sort(byDisplayOrder);
        languages = [...languageItems].sort(byDisplayOrder);

        educationKeyPoints = Object.fromEntries(
            await Promise.all(
                educations.map(async (education) => [
                    education.id,
                    (await listEducationKeyPoints(id, education.id)).sort(byDisplayOrder)
                ])
            )
        );

        workExperienceKeyPoints = Object.fromEntries(
            await Promise.all(
                workExperiences.map(async (workExperience) => [
                    workExperience.id,
                    (await listWorkExperienceKeyPoints(id, workExperience.id)).sort(byDisplayOrder)
                ])
            )
        );

        portfolioKeyPoints = Object.fromEntries(
            await Promise.all(
                portfolioProjects.map(async (project) => [
                    project.id,
                    (await listPortfolioKeyPoints(id, project.id)).sort(byDisplayOrder)
                ])
            )
        );

        portfolioTechnologies = Object.fromEntries(
            await Promise.all(
                portfolioProjects.map(async (project) => [
                    project.id,
                    (await listPortfolioTechnologies(id, project.id)).sort(byDisplayOrder)
                ])
            )
        );

        frameworks = Object.fromEntries(
            await Promise.all(
                languages.map(async (language) => [
                    language.id,
                    (await listFrameworks(id, language.id)).sort(byDisplayOrder)
                ])
            )
        );
    }

    async function load() {
        loading = true;
        error = null;
        sectionError = null;
        try {
            const id = Number(page.params.id);
            resume = await getResume(id);
            try {
                await loadSections(id);
            } catch (e) {
                const err = e as ApiError;
                sectionError = err.message;
            }
        } catch (e) {
            const err = e as ApiError;
            error = err.message;
        } finally {
            loading = false;
        }
    }

    async function retryLoadSections() {
        if (!resume) return;
        sectionLoading = true;
        sectionError = null;
        try {
            await loadSections(resume.id);
        } catch (e) {
            const err = e as ApiError;
            sectionError = err.message;
        } finally {
            sectionLoading = false;
        }
    }

    function formatDateRange(start: string, end: string | null): string {
        return `${start} - ${end && end.trim().length > 0 ? end : 'Present'}`;
    }

    async function handleExport() {
        if (!resume) return;
        exportErrorOpen = false;
        try {
            const blob = await exportResumeMarkdown(resume.id);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${resume.name}.md`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            const err = e as ApiError;
            exportErrorTitle = 'Export failed';
            exportErrorMessage = err.message;
            exportErrorOpen = true;
        }
    }

    function closeExportError() {
        exportErrorOpen = false;
    }

    onMount(() => {
        void load();
    });
</script>

<svelte:head>
    <title>{resume?.name} - Resume Editor</title>
</svelte:head>

{#if loading}
    <p class="stateText">Loading…</p>
{:else if error}
    <p class="stateText error">{error}</p>
    <Button variant="secondary" onclick={load} disabled={loading}>
        {#snippet icon()}<RefreshCw size={16} />{/snippet}
        Retry
    </Button>
{:else if resume}
    <ResumeViewHeader
        {resume}
        canEdit={$currentUser !== null && resume.created_by === $currentUser.id}
        onExport={handleExport}
    />

    <IconTabBar tabs={tabIcons} {activeTab} onselect={selectTab} onkeydown={onTabListKeydown} />

    <ErrorDialog
        open={exportErrorOpen}
        title={exportErrorTitle}
        message={exportErrorMessage}
        onclose={closeExportError}
    />

    {#if sectionError}
        <p class="sectionError">{sectionError}</p>
        {#if sectionLoading}
            <p class="stateText">Loading sections…</p>
        {:else}
            <Button variant="secondary" onclick={retryLoadSections}>
                {#snippet icon()}<RefreshCw size={16} />{/snippet}
                Retry
            </Button>
        {/if}
    {/if}

    <div
        class="panel"
        hidden={activeTab !== 'basics'}
        role="tabpanel"
        id="panel-basics"
        aria-labelledby="tab-basics"
        tabindex="0"
    >
        <ExecutiveSummaryCard summary={resume.executive_summary} />

        <div class="card">
            <FieldRow
                Icon={Eye}
                label="Visibility"
                value={resume.is_public ? 'Public' : 'Private'}
            />
            <FieldRow Icon={Mail} label="Email" value={resume.email} />
            <FieldRow
                Icon={Image}
                label="Profile Image URL"
                value={resume.profile_image_url ?? '-'}
                href={resume.profile_image_url ?? undefined}
                copyable={!!resume.profile_image_url}
            />
            <FieldRow Icon={MapPin} label="Location" value={resume.location ?? '-'} />
            <FieldRow
                Icon={Link}
                label="GitHub"
                value={resume.github_url ?? '-'}
                href={resume.github_url ?? undefined}
                copyable={!!resume.github_url}
            />
            <FieldRow Icon={Phone} label="Mobile" value={resume.mobile_number ?? '-'} />
        </div>
    </div>

    <div
        class="panel"
        hidden={activeTab !== 'education'}
        role="tabpanel"
        id="panel-education"
        aria-labelledby="tab-education"
        tabindex="0"
    >
        {#if educations.length === 0}
            <div class="card empty">No education entries yet.</div>
        {:else}
            <div class="stack">
                {#each educations as education (education.id)}
                    <div class="card sectionCard">
                        <div class="sectionHead">
                            <div>
                                <h2>{education.education_stage}</h2>
                                <p class="meta">{education.institution_name}</p>
                            </div>
                            <p class="date">
                                {formatDateRange(education.start_date, education.end_date)}
                            </p>
                        </div>
                        {#if education.degree}
                            <p class="bodyText">{education.degree}</p>
                        {/if}
                        {#if education.description}
                            <p class="bodyText muted">{education.description}</p>
                        {/if}
                        {#if (educationKeyPoints[education.id] ?? []).length > 0}
                            <ul class="bulletList">
                                {#each educationKeyPoints[education.id] ?? [] as keyPoint (keyPoint.id)}
                                    <li>{keyPoint.key_point}</li>
                                {/each}
                            </ul>
                        {/if}
                    </div>
                {/each}
            </div>
        {/if}
    </div>

    <div
        class="panel"
        hidden={activeTab !== 'work'}
        role="tabpanel"
        id="panel-work"
        aria-labelledby="tab-work"
        tabindex="0"
    >
        {#if workExperiences.length === 0}
            <div class="card empty">No work experience entries yet.</div>
        {:else}
            <div class="stack">
                {#each workExperiences as workExperience (workExperience.id)}
                    <div class="card sectionCard">
                        <div class="sectionHead">
                            <div>
                                <h2>{workExperience.job_title}</h2>
                                <p class="meta">{workExperience.company_name ?? '-'}</p>
                            </div>
                            <p class="date">
                                {formatDateRange(
                                    workExperience.start_date,
                                    workExperience.end_date
                                )}
                            </p>
                        </div>
                        {#if workExperience.description}
                            <p class="bodyText muted">{workExperience.description}</p>
                        {/if}
                        {#if (workExperienceKeyPoints[workExperience.id] ?? []).length > 0}
                            <ul class="bulletList">
                                {#each workExperienceKeyPoints[workExperience.id] ?? [] as keyPoint (keyPoint.id)}
                                    <li>{keyPoint.key_point}</li>
                                {/each}
                            </ul>
                        {/if}
                    </div>
                {/each}
            </div>
        {/if}
    </div>

    <div
        class="panel"
        hidden={activeTab !== 'portfolio'}
        role="tabpanel"
        id="panel-portfolio"
        aria-labelledby="tab-portfolio"
        tabindex="0"
    >
        {#if portfolioProjects.length === 0}
            <div class="card empty">No portfolio projects yet.</div>
        {:else}
            <div class="stack">
                {#each portfolioProjects as project (project.id)}
                    <div class="card sectionCard">
                        <div class="sectionHead">
                            <div>
                                <h2>{project.project_name}</h2>
                                {#if project.description}
                                    <p class="bodyText muted">{project.description}</p>
                                {/if}
                            </div>
                            <div class="linkGroup">
                                {#if project.project_link}
                                    <a
                                        class="link"
                                        href={project.project_link}
                                        target="_blank"
                                        rel="external"
                                    >
                                        Preview
                                    </a>
                                {/if}
                                {#if project.source_code_link}
                                    <a
                                        class="link"
                                        href={project.source_code_link}
                                        target="_blank"
                                        rel="external"
                                    >
                                        Source
                                    </a>
                                {/if}
                            </div>
                        </div>
                        {#if project.image_url}
                            <img
                                class="projectImage"
                                src={project.image_url}
                                alt={`Preview of ${project.project_name}`}
                            />
                        {/if}
                        {#if (portfolioTechnologies[project.id] ?? []).length > 0}
                            <div class="chips">
                                {#each portfolioTechnologies[project.id] ?? [] as technology (technology.id)}
                                    <span class="chip">{technology.technology_name}</span>
                                {/each}
                            </div>
                        {/if}
                        {#if (portfolioKeyPoints[project.id] ?? []).length > 0}
                            <ul class="bulletList">
                                {#each portfolioKeyPoints[project.id] ?? [] as keyPoint (keyPoint.id)}
                                    <li>{keyPoint.key_point}</li>
                                {/each}
                            </ul>
                        {/if}
                    </div>
                {/each}
            </div>
        {/if}
    </div>

    <div
        class="panel"
        hidden={activeTab !== 'skills'}
        role="tabpanel"
        id="panel-skills"
        aria-labelledby="tab-skills"
        tabindex="0"
    >
        {#if skills.length === 0}
            <div class="card empty">No skills added yet.</div>
        {:else}
            <div class="card">
                <div class="skillStack">
                    {#each skills as skill (skill.id)}
                        <div class="skillRow">
                            <div>
                                <p class="skillName">{skill.skill_name}</p>
                                <p class="skillMeta">{skill.confidence_percentage}% confidence</p>
                            </div>
                            <div class="skillTrack" aria-hidden="true">
                                <div
                                    class="skillBar"
                                    style={`width: ${skill.confidence_percentage}%`}
                                ></div>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}
    </div>

    <div
        class="panel"
        hidden={activeTab !== 'languages'}
        role="tabpanel"
        id="panel-languages"
        aria-labelledby="tab-languages"
        tabindex="0"
    >
        {#if languages.length === 0}
            <div class="card empty">No languages or frameworks added yet.</div>
        {:else}
            <div class="stack">
                {#each languages as language (language.id)}
                    <div class="card sectionCard">
                        <div class="sectionHead languageHead">
                            <h2>{language.language_name}</h2>
                            <p class="date">
                                {(frameworks[language.id] ?? []).length}
                                {(frameworks[language.id] ?? []).length === 1
                                    ? 'framework'
                                    : 'frameworks'}
                            </p>
                        </div>
                        {#if (frameworks[language.id] ?? []).length > 0}
                            <div class="chips">
                                {#each frameworks[language.id] ?? [] as framework (framework.id)}
                                    <span class="chip">{framework.framework_name}</span>
                                {/each}
                            </div>
                        {:else}
                            <p class="bodyText muted">No frameworks listed.</p>
                        {/if}
                    </div>
                {/each}
            </div>
        {/if}
    </div>
{/if}

<style>
    .stateText {
        margin: var(--space-6) 0;
        color: var(--color-muted);
    }

    .error {
        color: var(--color-danger);
    }

    .sectionError {
        color: var(--color-danger);
        margin: 0 0 var(--space-4);
    }

    .panel {
        margin-top: var(--space-2);
    }

    .card {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-card);
        overflow: hidden;
    }

    .empty {
        padding: var(--space-5);
        color: var(--color-muted);
        font-size: 14px;
    }

    .stack {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
    }

    .sectionCard {
        padding: var(--space-5);
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
    }

    .sectionHead {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: var(--space-2);
        align-items: flex-start;
    }

    .languageHead {
        flex-direction: row;
        align-items: center;
    }

    .sectionHead h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 700;
        color: var(--color-text);
    }

    .date {
        margin: 0;
        color: var(--color-muted);
        font-size: 13px;
        white-space: nowrap;
    }

    .meta {
        margin: 0;
        color: var(--color-muted);
        font-size: 13px;
    }

    .bodyText {
        margin: 0;
        color: var(--color-text);
        font-size: 14px;
        line-height: 1.6;
    }

    .bodyText.muted {
        color: var(--color-muted);
    }

    .bulletList {
        margin: 0;
        padding-left: 18px;
        color: var(--color-text);
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
        font-size: 14px;
    }

    .chips {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
    }

    .chip {
        padding: 6px 10px;
        border-radius: var(--radius-pill);
        background: var(--color-primary-light);
        color: var(--color-primary);
        font-size: 13px;
        font-weight: 500;
    }

    .link {
        color: var(--color-primary);
        text-decoration: none;
        word-break: break-word;
        font-size: 14px;
        font-weight: 500;
    }

    .link:hover {
        text-decoration: underline;
    }

    .linkGroup {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-3);
        justify-content: flex-end;
    }

    .projectImage {
        width: 100%;
        max-height: 260px;
        object-fit: cover;
        border-radius: var(--radius-sm);
        border: 1px solid var(--color-border);
    }

    .skillStack {
        padding: var(--space-5);
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
    }

    .skillRow {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(120px, 240px);
        gap: var(--space-4);
        align-items: center;
    }

    .skillName {
        margin: 0;
        font-weight: 600;
        color: var(--color-text);
        font-size: 14px;
    }

    .skillMeta {
        margin: 4px 0 0;
        color: var(--color-muted);
        font-size: 13px;
    }

    .skillTrack {
        height: 10px;
        border-radius: var(--radius-pill);
        background: var(--color-border);
        overflow: hidden;
    }

    .skillBar {
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, var(--color-primary), var(--color-primary-dark));
    }

    @media (max-width: 640px) {
        .sectionHead,
        .skillRow {
            grid-template-columns: 1fr;
            display: flex;
            flex-direction: column;
        }

        .languageHead {
            flex-direction: row;
        }

        .linkGroup {
            justify-content: flex-start;
        }
    }
</style>
