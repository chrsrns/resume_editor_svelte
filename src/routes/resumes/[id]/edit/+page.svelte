<script lang="ts">
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import { SvelteURLSearchParams } from 'svelte/reactivity';
    import { page } from '$app/state';
    import { resolve } from '$app/paths';
    import { deleteResume, getResume, updateResume } from '$lib/api/resumes';
    import { listSkills } from '$lib/api/skills';
    import { listEducations, listEducationKeyPoints } from '$lib/api/education';
    import { listWorkExperiences, listWorkExperienceKeyPoints } from '$lib/api/work-experience';
    import {
        listPortfolioProjects,
        listPortfolioKeyPoints,
        listPortfolioTechnologies
    } from '$lib/api/portfolio';
    import { listLanguages } from '$lib/api/languages';
    import { listFrameworks } from '$lib/api/frameworks';
    import type { ApiError } from '$lib/api/client';
    import { saveAll } from '$lib/stores/draft/saveOrchestrator';
    import ResumeForm from '$lib/components/ResumeForm.svelte';
    import EducationSection from '$lib/components/sections/EducationSection.svelte';
    import LanguagesFrameworksSection from '$lib/components/sections/LanguagesFrameworksSection.svelte';
    import PortfolioProjectsSection from '$lib/components/sections/PortfolioProjectsSection.svelte';
    import SkillsSection from '$lib/components/sections/SkillsSection.svelte';
    import WorkExperiencesSection from '$lib/components/sections/WorkExperiencesSection.svelte';
    import SaveResultPopup from '$lib/components/ui/SaveResultPopup.svelte';
    import type {
        Resume,
        EducationKeyPoint,
        WorkExperienceKeyPoint,
        PortfolioKeyPoint,
        PortfolioTechnology,
        Framework
    } from '$lib/types';
    import { authToken } from '$lib/auth';
    import { currentUser } from '$lib/session';
    import { basics, skills, education, work, portfolio, languages } from '$lib/stores/draft';
    import IconTabBar from '$lib/components/IconTabBar.svelte';
    import Button from '$lib/components/ui/Button.svelte';
    import User from '@lucide/svelte/icons/user';
    import GraduationCap from '@lucide/svelte/icons/graduation-cap';
    import Briefcase from '@lucide/svelte/icons/briefcase';
    import Folder from '@lucide/svelte/icons/folder';
    import Star from '@lucide/svelte/icons/star';
    import Globe from '@lucide/svelte/icons/globe';
    import ChevronLeft from '@lucide/svelte/icons/chevron-left';
    import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
    import Trash2 from '@lucide/svelte/icons/trash-2';
    import Save from '@lucide/svelte/icons/save';

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

    let resume = $state<Resume | null>(null);
    let loading = $state(true);
    let saving = $state(false);
    let deleting = $state(false);
    let error = $state<string | null>(null);
    let activeTab = $derived(parseTabId(page.url.searchParams.get('tab')));

    // Save result popup state
    let savePopupOpen = $state(false);
    let savePopupSuccess = $state(true);
    let savePopupMessage = $state('');
    let savePopupErrors = $state<Array<{ section: string; error: string }>>([]);

    // Global dirty state (basics + skills + education + work + portfolio + languages)
    const isDirty = $derived(
        basics.isDirty() ||
            skills.isDirty() ||
            education.isDirty() ||
            work.isDirty() ||
            portfolio.isDirty() ||
            languages.isDirty()
    );

    // Global validation errors
    const hasValidationErrors = $derived(
        basics.getValidationError() !== null ||
            skills.getValidationErrors().length > 0 ||
            education.getValidationErrors().length > 0 ||
            work.getValidationErrors().length > 0 ||
            portfolio.getValidationErrors().length > 0 ||
            languages.getValidationErrors().length > 0
    );

    // Reactive visible drafts for SkillsSection
    const visibleSkillDrafts = $derived.by(() => skills.getVisibleDrafts());

    // Reactive visible drafts for EducationSection
    const visibleEducationDrafts = $derived.by(() => education.getVisibleDrafts());
    const visibleKeyPoints = $derived.by(() => {
        const result: Record<number, ReturnType<typeof education.getVisibleKeyPoints>> = {};
        for (const draft of education.getVisibleDrafts()) {
            result[draft.id] = education.getVisibleKeyPoints(draft.id);
        }
        return result;
    });

    // Reactive visible drafts for WorkExperiencesSection
    const visibleWorkDrafts = $derived.by(() => work.getVisibleDrafts());
    const visibleWorkKeyPoints = $derived.by(() => {
        const result: Record<number, ReturnType<typeof work.getVisibleKeyPoints>> = {};
        for (const draft of work.getVisibleDrafts()) {
            result[draft.id] = work.getVisibleKeyPoints(draft.id);
        }
        return result;
    });

    // Reactive visible drafts for PortfolioProjectsSection
    const visiblePortfolioDrafts = $derived.by(() => portfolio.getVisibleDrafts());
    const visiblePortfolioKeyPoints = $derived.by(() => {
        const result: Record<number, ReturnType<typeof portfolio.getVisibleKeyPoints>> = {};
        for (const draft of portfolio.getVisibleDrafts()) {
            result[draft.id] = portfolio.getVisibleKeyPoints(draft.id);
        }
        return result;
    });
    const visiblePortfolioTechnologies = $derived.by(() => {
        const result: Record<number, ReturnType<typeof portfolio.getVisibleTechnologies>> = {};
        for (const draft of portfolio.getVisibleDrafts()) {
            result[draft.id] = portfolio.getVisibleTechnologies(draft.id);
        }
        return result;
    });

    // Reactive visible drafts for LanguagesFrameworksSection
    const visibleLanguageDrafts = $derived.by(() => languages.getVisibleDrafts());
    const visibleLanguageFrameworks = $derived.by(() => {
        const result: Record<number, ReturnType<typeof languages.getVisibleFrameworks>> = {};
        for (const draft of languages.getVisibleDrafts()) {
            result[draft.id] = languages.getVisibleFrameworks(draft.id);
        }
        return result;
    });

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
        void goto(resolve(`/resumes/${page.params.id}/edit?${params.toString()}`), {
            replaceState: false,
            noScroll: true,
            keepFocus: true
        });
    }

    async function load() {
        loading = true;
        error = null;
        try {
            const id = Number(page.params.id);
            resume = await getResume(id);

            // Initialize draft modules
            basics.initialize(resume);
            const skillsData = await listSkills(resume.id);
            skills.initialize(skillsData);

            // Load education data
            const educationData = await listEducations(resume.id);
            const keyPointsData: EducationKeyPoint[] = [];
            for (const edu of educationData) {
                const kps = await listEducationKeyPoints(resume.id, edu.id);
                keyPointsData.push(...kps);
            }
            education.initialize(educationData, keyPointsData);

            // Load work data
            const workData = await listWorkExperiences(resume.id);
            const workKeyPointsData: WorkExperienceKeyPoint[] = [];
            for (const exp of workData) {
                const kps = await listWorkExperienceKeyPoints(resume.id, exp.id);
                workKeyPointsData.push(...kps);
            }
            work.initialize(workData, workKeyPointsData);

            // Load portfolio data
            const portfolioData = await listPortfolioProjects(resume.id);
            const portfolioKeyPointsData: PortfolioKeyPoint[] = [];
            const portfolioTechnologiesData: PortfolioTechnology[] = [];
            for (const proj of portfolioData) {
                const kps = await listPortfolioKeyPoints(resume.id, proj.id);
                portfolioKeyPointsData.push(...kps);
                const techs = await listPortfolioTechnologies(resume.id, proj.id);
                portfolioTechnologiesData.push(...techs);
            }
            portfolio.initialize(portfolioData, portfolioKeyPointsData, portfolioTechnologiesData);

            // Load languages data
            const languagesData = await listLanguages(resume.id);
            const frameworksData: Framework[] = [];
            for (const lang of languagesData) {
                const fws = await listFrameworks(resume.id, lang.id);
                frameworksData.push(...fws);
            }
            languages.initialize(languagesData, frameworksData);
        } catch (e) {
            const err = e as ApiError;
            error = err.message;
        } finally {
            loading = false;
        }
    }

    onMount(() => {
        if (!$authToken) {
            void goto(resolve('/auth/login'));
            return;
        }
        void load();
    });

    async function handleUnifiedSave() {
        if (!resume || hasValidationErrors) return;

        saving = true;
        error = null;

        const result = await saveAll(resume.id);

        savePopupSuccess = result.success;
        savePopupMessage = result.message;
        savePopupErrors = result.errors;
        savePopupOpen = true;
        saving = false;
    }

    function handleDiscard() {
        if (!confirm('Discard all unsaved changes?')) return;
        basics.resetToBaseline();
        skills.resetToBaseline();
        education.resetToBaseline();
        work.resetToBaseline();
        portfolio.resetToBaseline();
        languages.resetToBaseline();
        error = null;
    }

    async function handleDelete() {
        if (!resume) return;
        const confirmed = confirm('Delete this resume?');
        if (!confirmed) return;

        error = null;
        deleting = true;
        try {
            await deleteResume(resume.id);
            await goto(resolve('/resumes'));
        } catch (e) {
            const err = e as ApiError;
            error = err.message;
        } finally {
            deleting = false;
        }
    }

    function closeSavePopup() {
        savePopupOpen = false;
        savePopupErrors = [];
    }

    function retrySave() {
        closeSavePopup();
        void handleUnifiedSave();
    }

    // beforeunload guard for unsaved changes
    $effect(() => {
        if (!isDirty) return;
        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    });
</script>

<svelte:head>
    <title>Editing resume of: {resume?.name} - Resume Editor</title>
</svelte:head>

{#if loading}
    <p class="stateText">Loading…</p>
{:else if error}
    <p class="stateText error">{error}</p>
{:else if resume}
    <div class="header">
        <div>
            <h1>Edit resume</h1>
            <p class="muted">{resume.name}</p>
        </div>
        <div class="actions">
            <Button variant="secondary" onclick={handleDiscard} disabled={saving || !isDirty}>
                {#snippet icon()}<RotateCcw size={16} />{/snippet}
                Discard
            </Button>
            <Button variant="secondary" onclick={() => goto(resolve(`/resumes/${resume!.id}`))}>
                {#snippet icon()}<ChevronLeft size={16} />{/snippet}
                Cancel
            </Button>
            {#if isDirty}
                <div class="tooltip-wrapper">
                    <Button
                        variant="primary"
                        disabled={saving || hasValidationErrors}
                        onclick={handleUnifiedSave}
                    >
                        {#snippet icon()}<Save size={16} />{/snippet}
                        {saving ? 'Saving…' : 'Save'}
                    </Button>
                    {#if hasValidationErrors}
                        <span class="tooltip">Fix errors before saving</span>
                    {:else}
                        <span class="tooltip">Unsaved changes</span>
                    {/if}
                </div>
            {/if}
            <Button variant="danger" onclick={handleDelete} disabled={deleting}>
                {#snippet icon()}<Trash2 size={16} />{/snippet}
                {deleting ? 'Deleting…' : 'Delete'}
            </Button>
        </div>
    </div>

    {#if $currentUser && resume.created_by !== $currentUser.id}
        <div class="card errorCard">
            <p class="error">Forbidden</p>
        </div>
    {:else}
        <IconTabBar tabs={tabIcons} {activeTab} onselect={selectTab} onkeydown={onTabListKeydown} />

        <div
            class="panel"
            hidden={activeTab !== 'basics'}
            role="tabpanel"
            id="panel-basics"
            aria-labelledby="tab-basics"
            tabindex="0"
        >
            <ResumeForm formId="resume-form" />
        </div>

        <div
            class="panel"
            hidden={activeTab !== 'education'}
            role="tabpanel"
            id="panel-education"
            aria-labelledby="tab-education"
            tabindex="0"
        >
            <EducationSection
                drafts={visibleEducationDrafts}
                keyPoints={visibleKeyPoints}
                onAddEducation={(draft) => education.addEducation(draft)}
                onUpdateEducation={(id, partial) => education.updateEducation(id, partial)}
                onRemoveEducation={(id) => education.removeEducation(id)}
                onReorder={(from, to) => education.reorderEducation(from, to)}
                onAddKeyPoint={(educationId, draft) => education.addKeyPoint(educationId, draft)}
                onUpdateKeyPoint={(id, partial) => education.updateKeyPoint(id, partial)}
                onRemoveKeyPoint={(id) => education.removeKeyPoint(id)}
                onReorderKeyPoints={(educationId, from, to) =>
                    education.reorderKeyPoint(educationId, from, to)}
                onValidateEducation={(id) => education.validateEducation(id)}
                onValidateKeyPoint={(id) => education.validateKeyPoint(id)}
                {saving}
            />
        </div>
        <div
            class="panel"
            hidden={activeTab !== 'work'}
            role="tabpanel"
            id="panel-work"
            aria-labelledby="tab-work"
            tabindex="0"
        >
            <WorkExperiencesSection
                drafts={visibleWorkDrafts}
                keyPoints={visibleWorkKeyPoints}
                onAddWork={(draft) => work.addWork(draft)}
                onUpdateWork={(id: number, partial) => work.updateWork(id, partial)}
                onRemoveWork={(id: number) => work.removeWork(id)}
                onReorder={(from: number, to: number) => work.reorder(from, to)}
                onToggleActive={(id: number) => {
                    // For now, just a placeholder - active state is not managed in drafts yet
                    // This will be implemented when we add active state to the draft module
                }}
                onAddKeyPoint={(workId: number, draft) => work.addKeyPoint(workId, draft)}
                onUpdateKeyPoint={(id: number, partial) => work.updateKeyPoint(id, partial)}
                onRemoveKeyPoint={(id: number) => work.removeKeyPoint(id)}
                onReorderKeyPoints={(workId: number, from: number, to: number) =>
                    work.reorderKeyPoints(workId, from, to)}
                onValidateWork={(id: number) => work.validateWork(id)}
                onValidateKeyPoint={(id: number) => work.validateKeyPoint(id)}
                {saving}
            />
        </div>
        <div
            class="panel"
            hidden={activeTab !== 'portfolio'}
            role="tabpanel"
            id="panel-portfolio"
            aria-labelledby="tab-portfolio"
            tabindex="0"
        >
            <PortfolioProjectsSection
                drafts={visiblePortfolioDrafts}
                keyPoints={visiblePortfolioKeyPoints}
                technologies={visiblePortfolioTechnologies}
                onAddProject={(draft) => portfolio.addProject(draft)}
                onUpdateProject={(id: number, partial) => portfolio.updateProject(id, partial)}
                onRemoveProject={(id: number) => portfolio.removeProject(id)}
                onAddKeyPoint={(projectId: number, draft) =>
                    portfolio.addKeyPoint(projectId, draft)}
                onUpdateKeyPoint={(id: number, partial) => portfolio.updateKeyPoint(id, partial)}
                onRemoveKeyPoint={(id: number) => portfolio.removeKeyPoint(id)}
                onAddTechnology={(projectId: number, draft) =>
                    portfolio.addTechnology(projectId, draft)}
                onUpdateTechnology={(id: number, partial) =>
                    portfolio.updateTechnology(id, partial)}
                onRemoveTechnology={(id: number) => portfolio.removeTechnology(id)}
                onReorder={(from: number, to: number) => portfolio.reorder(from, to)}
                onReorderKeyPoints={(projectId: number, from: number, to: number) =>
                    portfolio.reorderKeyPoints(projectId, from, to)}
                onReorderTechnologies={(projectId: number, from: number, to: number) =>
                    portfolio.reorderTechnologies(projectId, from, to)}
                onValidateProject={(id: number) => portfolio.validateProject(id)}
                onValidateKeyPoint={(id: number) => portfolio.validateKeyPoint(id)}
                onValidateTechnology={(id: number) => portfolio.validateTechnology(id)}
                {saving}
            />
        </div>
        <div
            class="panel"
            hidden={activeTab !== 'skills'}
            role="tabpanel"
            id="panel-skills"
            aria-labelledby="tab-skills"
            tabindex="0"
        >
            <SkillsSection
                drafts={visibleSkillDrafts}
                onAdd={(draft) => skills.add(draft)}
                onUpdate={(id, partial) => skills.update(id, partial)}
                onDelete={(id) => skills.remove(id)}
                onReorder={(from, to) => skills.reorder(from, to)}
                {saving}
            />
        </div>
        <div
            class="panel"
            hidden={activeTab !== 'languages'}
            role="tabpanel"
            id="panel-languages"
            aria-labelledby="tab-languages"
            tabindex="0"
        >
            <LanguagesFrameworksSection
                drafts={visibleLanguageDrafts}
                frameworks={visibleLanguageFrameworks}
                onAddLanguage={(draft) => languages.addLanguage(draft)}
                onUpdateLanguage={(id: number, partial) => languages.updateLanguage(id, partial)}
                onRemoveLanguage={(id: number) => languages.removeLanguage(id)}
                onAddFramework={(languageId: number, draft) =>
                    languages.addFramework(languageId, draft)}
                onUpdateFramework={(id: number, partial) => languages.updateFramework(id, partial)}
                onRemoveFramework={(id: number) => languages.removeFramework(id)}
                onReorder={(from: number, to: number) => languages.reorder(from, to)}
                onReorderFrameworks={(languageId: number, from: number, to: number) =>
                    languages.reorderFrameworks(languageId, from, to)}
                onValidateLanguage={(id: number) => languages.validateLanguage(id)}
                onValidateFramework={(id: number) => languages.validateFramework(id)}
                {saving}
            />
        </div>
    {/if}
{/if}

<SaveResultPopup
    open={savePopupOpen}
    success={savePopupSuccess}
    message={savePopupMessage}
    errors={savePopupErrors}
    onclose={closeSavePopup}
    onretry={retrySave}
/>

<style>
    .header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--space-4);
        margin-top: var(--space-8);
        margin-bottom: var(--space-4);
    }

    h1 {
        margin: 0;
        font-size: 24px;
        font-weight: 700;
        color: var(--color-text);
    }

    .actions {
        display: flex;
        gap: var(--space-2);
        flex-wrap: wrap;
    }

    .tooltip-wrapper {
        position: relative;
        display: inline-block;
    }

    .tooltip {
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        background: var(--color-text);
        color: var(--color-surface);
        padding: 4px 8px;
        border-radius: var(--radius-sm);
        font-size: 12px;
        white-space: nowrap;
        margin-bottom: 4px;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s;
    }

    .tooltip-wrapper:hover .tooltip {
        opacity: 1;
    }

    .muted {
        color: var(--color-muted);
        margin: var(--space-1) 0 0;
        font-size: 14px;
    }

    .stateText {
        color: var(--color-muted);
        margin: var(--space-8) 0;
        text-align: center;
    }

    .stateText.error {
        color: var(--color-danger);
    }

    .error {
        color: var(--color-danger);
        margin: 0;
    }

    .card {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-card);
        padding: var(--space-4);
    }

    .panel {
        margin-top: var(--space-2);
    }
</style>
