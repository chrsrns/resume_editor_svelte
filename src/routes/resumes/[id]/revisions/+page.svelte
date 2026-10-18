<script lang="ts">
    import { goto } from '$app/navigation';
    import { resolve } from '$app/paths';
    import { page } from '$app/state';
    import { onMount } from 'svelte';
    import { SvelteURLSearchParams } from 'svelte/reactivity';
    import { get } from 'svelte/store';
    import { authToken } from '$lib/auth';
    import { getResume, listRevisions } from '$lib/api/resumes';
    import { ApiError } from '$lib/api/client';
    import { parseRevisionParam } from '$lib/revisions';
    import type { Resume, ResumeRevisionSummary } from '$lib/types';
    import Button from '$lib/components/ui/Button.svelte';
    import ErrorDialog from '$lib/components/ui/ErrorDialog.svelte';
    import RevisionTimeline from '$lib/components/revisions/RevisionTimeline.svelte';
    import RevisionPanel from '$lib/components/revisions/RevisionPanel.svelte';
    import ChevronLeft from '@lucide/svelte/icons/chevron-left';
    import RefreshCw from '@lucide/svelte/icons/refresh-cw';

    let loading = $state(true);
    let inaccessible = $state(false);
    let loadError = $state<string | null>(null);
    let resume = $state<Resume | null>(null);
    let revisions = $state<ResumeRevisionSummary[]>([]);

    let historyErrorOpen = $state(false);
    let historyErrorTitle = $state('History error');
    let historyErrorMessage = $state('');

    const resumeId = $derived(page.params.id ?? '');
    const selection = $derived(parseRevisionParam(page.url.searchParams.get('n')));
    const head = $derived(revisions[0]?.revision ?? 0);
    const selectionState = $derived(
        selection.kind === 'selected' && selection.n <= head
            ? selection
            : selection.kind === 'selected'
              ? ({ kind: 'invalid' } as const)
              : selection
    );
    const selectedN = $derived(selectionState.kind === 'selected' ? selectionState.n : null);
    const closeHref = $derived.by(() => {
        const params = new SvelteURLSearchParams(page.url.searchParams);
        params.delete('n');
        const qs = params.toString();
        const base = resolve(`/resumes/${resumeId}/revisions`);
        return qs ? `${base}?${qs}` : base;
    });

    function showHistoryError(title: string, e: unknown) {
        historyErrorTitle = title;
        historyErrorMessage = e instanceof ApiError ? e.message : 'Request failed';
        historyErrorOpen = true;
    }

    function isAuthError(e: unknown): boolean {
        return e instanceof ApiError && e.status === 401;
    }

    function isInaccessible(e: unknown): boolean {
        return (
            e instanceof ApiError &&
            (e.status === 403 || e.status === 404 || e.status === 422)
        );
    }

    async function load(id: string) {
        loading = true;
        inaccessible = false;
        loadError = null;
        const stale = () => page.params.id !== id;
        const [titleRes, revRes] = await Promise.allSettled([
            getResume(id),
            listRevisions(id)
        ]);
        if (stale()) return;

        const failures = [titleRes, revRes]
            .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
            .map((r) => r.reason);

        if (failures.some(isAuthError)) {
            void goto(resolve('/auth/login'));
            return;
        }
        if (failures.some(isInaccessible)) {
            inaccessible = true;
        } else if (failures.length > 0) {
            loadError = failures[0] instanceof ApiError ? failures[0].message : 'Request failed';
            showHistoryError('History unavailable', failures[0]);
        } else {
            resume = (titleRes as PromiseFulfilledResult<Resume>).value;
            revisions = (revRes as PromiseFulfilledResult<ResumeRevisionSummary[]>).value;
        }
        loading = false;
    }

    async function reloadTimeline(id: string) {
        try {
            const next = await listRevisions(id);
            if (page.params.id !== id) return;
            revisions = next;
        } catch (e) {
            if (page.params.id !== id) return;
            if (isAuthError(e)) {
                void goto(resolve('/auth/login'));
            } else if (isInaccessible(e)) {
                inaccessible = true;
            } else {
                showHistoryError('Failed to reload history', e);
            }
        }
    }

    function handleRestored(updated: Resume) {
        resume = updated;
        void reloadTimeline(resumeId);
    }

    function handleConflict(e: unknown) {
        showHistoryError('Restore failed', e);
        void reloadTimeline(resumeId);
    }

    onMount(() => {
        if (!get(authToken)) {
            void goto(resolve('/auth/login'));
            return;
        }
        void load(resumeId);
    });
</script>

<svelte:head>
    <title>{resume?.name ? `${resume.name} — Revision history` : 'Revision history'}</title>
</svelte:head>

{#if loading}
    <p class="stateText">Loading…</p>
{:else if inaccessible}
    <p class="stateText">Resume not found or is private</p>
    <Button variant="secondary" href={resolve(`/resumes/${resumeId}`)}>
        {#snippet icon()}<ChevronLeft size={16} />{/snippet}
        Back
    </Button>
{:else if loadError}
    <p class="stateText error">{loadError}</p>
    <Button variant="secondary" onclick={() => load(resumeId)} disabled={loading}>
        {#snippet icon()}<RefreshCw size={16} />{/snippet}
        Retry
    </Button>
{:else}
    <header class="pageHead">
        <div>
            <h1>{resume?.name}</h1>
            <p class="subtitle">Revision history</p>
        </div>
        <Button variant="secondary" href={resolve(`/resumes/${resumeId}`)}>
            {#snippet icon()}<ChevronLeft size={16} />{/snippet}
            Back to resume
        </Button>
    </header>

    <div class="layout">
        <RevisionTimeline {revisions} {selectedN} {resumeId} />

        {#if selectionState.kind === 'invalid'}
            <section class="panelRegion" aria-label="Revision panel">
                <div class="panelWall">
                    <h2>Revision not found</h2>
                    <p>
                        The requested revision is malformed or does not exist for this resume.
                    </p>
                    <Button variant="secondary" href={closeHref}>
                        {#snippet icon()}<ChevronLeft size={16} />{/snippet}
                        Back to timeline
                    </Button>
                </div>
            </section>
        {:else if selectionState.kind === 'selected'}
            <section class="panelRegion" aria-label="Revision panel">
                {#key selectionState.n}
                    <RevisionPanel
                        {resumeId}
                        n={selectionState.n}
                        {closeHref}
                        onunauthorized={() => void goto(resolve('/auth/login'))}
                        oninaccessible={() => (inaccessible = true)}
                        onerror={showHistoryError}
                        onrestored={handleRestored}
                        onconflict={handleConflict}
                    />
                {/key}
            </section>
        {/if}
    </div>
{/if}

<ErrorDialog
    open={historyErrorOpen}
    title={historyErrorTitle}
    message={historyErrorMessage}
    onclose={() => (historyErrorOpen = false)}
/>

<style>
    .stateText {
        margin: var(--space-6) 0;
        color: var(--color-muted);
    }

    .error {
        color: var(--color-danger);
    }

    .pageHead {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--space-4);
        margin-top: var(--space-6);
        margin-bottom: var(--space-6);
        flex-wrap: wrap;
    }

    .pageHead h1 {
        margin: 0;
        font-size: 28px;
        font-weight: 700;
        color: var(--color-text);
    }

    .subtitle {
        margin: var(--space-1) 0 0;
        color: var(--color-muted);
        font-size: 14px;
    }

    .layout {
        display: grid;
        grid-template-columns: minmax(260px, 340px) 1fr;
        gap: var(--space-5);
        align-items: start;
    }

    .layout > :global(.timeline:last-child),
    .layout > :global(.timeline):only-child {
        grid-column: 1 / -1;
        max-width: 720px;
    }

    .panelWall {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-card);
        padding: var(--space-5);
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
        align-items: flex-start;
    }

    .panelWall h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 700;
    }

    .panelWall p {
        margin: 0;
        color: var(--color-muted);
        font-size: 14px;
    }

    @media (max-width: 900px) {
        .layout {
            grid-template-columns: 1fr;
        }
    }
</style>
