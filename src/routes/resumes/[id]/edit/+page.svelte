<script lang="ts">
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import { SvelteURLSearchParams } from 'svelte/reactivity';
    import { page } from '$app/state';
    import { resolve } from '$app/paths';
    import { deleteResume, getResume, updateResume } from '$lib/api/resumes';
    import { createSkill, deleteSkill, listSkills, updateSkill } from '$lib/api/skills';
    import type { ApiError } from '$lib/api/client';
    import ResumeForm from '$lib/components/ResumeForm.svelte';
    import EducationSection from '$lib/components/sections/EducationSection.svelte';
    import LanguagesFrameworksSection from '$lib/components/sections/LanguagesFrameworksSection.svelte';
    import PortfolioProjectsSection from '$lib/components/sections/PortfolioProjectsSection.svelte';
    import SkillsSection from '$lib/components/sections/SkillsSection.svelte';
    import WorkExperiencesSection from '$lib/components/sections/WorkExperiencesSection.svelte';
    import type { Resume } from '$lib/types';
    import { authToken } from '$lib/auth';
    import { currentUser } from '$lib/session';
    import { basics, skills } from '$lib/stores/draft';
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

    // Global dirty state (basics + skills only for Phase 1)
    const isDirty = $derived(basics.isDirty() || skills.isDirty());

    // Global validation errors
    const hasValidationErrors = $derived(
        basics.getValidationError() !== null || skills.getValidationErrors().length > 0
    );

    // Reactive visible drafts for SkillsSection
    const visibleSkillDrafts = $derived.by(() => skills.getVisibleDrafts());

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

        try {
            // Phase 1: Resume (basics)
            if (basics.isDirty()) {
                await updateResume(resume.id, basics.toUpdatePayload());
                basics.applySaveResults();
            }

            // Phase 2: Skills creations
            const skillActions = skills.computeDiff();
            const skillCreations = skillActions.filter((a) => a.type === 'create');

            const skillCreationResults = await Promise.allSettled(
                skillCreations.map(async (action) => {
                    const result = await createSkill(resume!.id, action.payload);
                    return { action, realId: result.id };
                })
            );

            // Build tempId -> realId mapping
            const tempIdMap = new Map<number, number>();
            for (const result of skillCreationResults) {
                if (result.status === 'fulfilled') {
                    tempIdMap.set(result.value.action.tempId, result.value.realId);
                }
            }

            // Apply successful creations
            skills.applySaveResults(tempIdMap);

            // Phase 3: Skills updates and deletions
            const skillUpdatesAndDeletes = skillActions.filter(
                (a) => a.type === 'update' || a.type === 'delete'
            );

            const skillUpdateDeleteResults = await Promise.allSettled(
                skillUpdatesAndDeletes.map(async (action) => {
                    if (action.type === 'delete') {
                        await deleteSkill(action.id);
                        return { action };
                    } else {
                        await updateSkill(action.id, action.payload);
                        return { action };
                    }
                })
            );

            // Check for failures
            const failures = [
                ...skillCreationResults.filter((r) => r.status === 'rejected'),
                ...skillUpdateDeleteResults.filter((r) => r.status === 'rejected')
            ];

            if (failures.length > 0) {
                const failedIds = new Set<number>();
                for (const failure of failures) {
                    if (failure.status === 'rejected') {
                        // Extract the ID from the action (this is a simplification)
                        // In production, we'd track this more carefully
                        error = failure.reason.message;
                    }
                }
                // Keep failed items in dirty state
                // skills.keepFailedItems(failedIds);
            } else {
                // Full success: baselines already updated by applySaveResults
                // No need to reload from server
            }
        } catch (e) {
            const err = e as ApiError;
            error = err.message;
        } finally {
            saving = false;
        }
    }

    function handleDiscard() {
        if (!confirm('Discard all unsaved changes?')) return;
        basics.resetToBaseline();
        skills.resetToBaseline();
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
                <Button
                    variant="primary"
                    disabled={saving || hasValidationErrors}
                    onclick={handleUnifiedSave}
                >
                    {#snippet icon()}<Save size={16} />{/snippet}
                    {saving ? 'Saving…' : 'Save'}
                </Button>
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
            <EducationSection resumeId={resume.id} />
        </div>
        <div
            class="panel"
            hidden={activeTab !== 'work'}
            role="tabpanel"
            id="panel-work"
            aria-labelledby="tab-work"
            tabindex="0"
        >
            <WorkExperiencesSection resumeId={resume.id} />
        </div>
        <div
            class="panel"
            hidden={activeTab !== 'portfolio'}
            role="tabpanel"
            id="panel-portfolio"
            aria-labelledby="tab-portfolio"
            tabindex="0"
        >
            <PortfolioProjectsSection resumeId={resume.id} />
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
            <LanguagesFrameworksSection resumeId={resume.id} />
        </div>
    {/if}
{/if}

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
