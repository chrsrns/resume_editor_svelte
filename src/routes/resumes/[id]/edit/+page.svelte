<script lang="ts">
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import { SvelteURLSearchParams } from 'svelte/reactivity';
    import { page } from '$app/state';
    import { resolve } from '$app/paths';
    import { deleteResume, getResume, updateResume } from '$lib/api/resumes';
    import type { ApiError } from '$lib/api/client';
    import ResumeForm from '$lib/components/ResumeForm.svelte';
    import EducationSection from '$lib/components/sections/EducationSection.svelte';
    import LanguagesFrameworksSection from '$lib/components/sections/LanguagesFrameworksSection.svelte';
    import PortfolioProjectsSection from '$lib/components/sections/PortfolioProjectsSection.svelte';
    import SkillsSection from '$lib/components/sections/SkillsSection.svelte';
    import WorkExperiencesSection from '$lib/components/sections/WorkExperiencesSection.svelte';
    import type { Resume, UpdateResumeRequest } from '$lib/types';
    import { authToken } from '$lib/auth';
    import { currentUser } from '$lib/session';
    import IconTabBar from '$lib/components/IconTabBar.svelte';
    import Button from '$lib/components/ui/Button.svelte';
    import User from '@lucide/svelte/icons/user';
    import GraduationCap from '@lucide/svelte/icons/graduation-cap';
    import Briefcase from '@lucide/svelte/icons/briefcase';
    import Folder from '@lucide/svelte/icons/folder';
    import Star from '@lucide/svelte/icons/star';
    import Globe from '@lucide/svelte/icons/globe';
    import ChevronLeft from '@lucide/svelte/icons/chevron-left';
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

    async function handleSubmit(payload: UpdateResumeRequest & { is_public: boolean }) {
        if (!resume) return;
        error = null;
        saving = true;
        try {
            const updated = await updateResume(resume.id, payload);
            await goto(resolve(`/resumes/${updated.id}`));
        } catch (e) {
            const err = e as ApiError;
            error = err.message;
        } finally {
            saving = false;
        }
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
            <Button variant="secondary" onclick={() => goto(resolve(`/resumes/${resume!.id}`))}>
                {#snippet icon()}<ChevronLeft size={16} />{/snippet}
                Cancel
            </Button>
            <Button
                variant="primary"
                disabled={saving}
                onclick={() =>
                    (
                        document.getElementById('resume-form') as HTMLFormElement | null
                    )?.requestSubmit()}
            >
                {#snippet icon()}<Save size={16} />{/snippet}
                {saving ? 'Saving…' : 'Save'}
            </Button>
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
            <ResumeForm
                initial={resume}
                submitLabel={saving ? 'Saving…' : 'Save'}
                onsubmit={handleSubmit}
                showSubmitButton={false}
                formId="resume-form"
            />
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
            <SkillsSection resumeId={resume.id} />
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
