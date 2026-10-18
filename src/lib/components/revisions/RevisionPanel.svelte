<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/state';
    import { resolve } from '$app/paths';
    import { getRevision, getRevisionDiff, listRevisions, restoreRevision } from '$lib/api/resumes';
    import { ApiError } from '$lib/api/client';
    import { formatRevisionTimestamp, revisionActionLabel } from '$lib/revisions';
    import type { Resume, ResumeRevision, ResumeRevisionDiff } from '$lib/types';
    import Button from '$lib/components/ui/Button.svelte';
    import RevisionSnapshot from './RevisionSnapshot.svelte';
    import RevisionDiff from './RevisionDiff.svelte';
    import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
    import X from '@lucide/svelte/icons/x';

    let {
        resumeId,
        n,
        closeQuery,
        onunauthorized,
        oninaccessible,
        onerror,
        onrestored,
        onconflict
    }: {
        resumeId: string;
        n: number;
        closeQuery: string;
        onunauthorized: () => void;
        oninaccessible: () => void;
        onerror: (title: string, e: unknown) => void;
        onrestored: (resume: Resume) => void;
        onconflict: (e: unknown) => void;
    } = $props();

    let revision = $state<ResumeRevision | null>(null);
    let diff = $state<ResumeRevisionDiff | null>(null);
    let loading = $state(true);
    let notFound = $state(false);
    let view = $state<'changes' | 'state'>('changes');
    let restoring = $state(false);

    onMount(async () => {
        const [revRes, diffRes] = await Promise.allSettled([
            getRevision(resumeId, n),
            getRevisionDiff(resumeId, n)
        ]);

        const failures = [revRes, diffRes]
            .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
            .map((r) => r.reason);

        if (failures.some((e) => e instanceof ApiError && e.status === 401)) {
            onunauthorized();
            return;
        }
        if (failures.some((e) => e instanceof ApiError && e.status === 404)) {
            notFound = true;
            loading = false;
            return;
        }
        if (failures.some((e) => e instanceof ApiError && (e.status === 403 || e.status === 422))) {
            oninaccessible();
            return;
        }
        if (failures.length > 0) {
            onerror('Failed to load revision', failures[0]);
            loading = false;
            return;
        }

        revision = (revRes as PromiseFulfilledResult<ResumeRevision>).value;
        diff = (diffRes as PromiseFulfilledResult<ResumeRevisionDiff>).value;
        loading = false;
    });

    async function handleRestore() {
        if (restoring || !revision) return;
        const confirmed = confirm(
            `Restore the state before revision ${n}? Your current state will be kept as a new revision.`
        );
        if (!confirmed) return;

        restoring = true;
        const stillCurrent = () => page.params.id === resumeId;
        try {
            let timeline;
            try {
                timeline = await listRevisions(resumeId);
            } catch (e) {
                if (!stillCurrent()) return;
                if (e instanceof ApiError && e.status === 401) {
                    onunauthorized();
                } else if (
                    e instanceof ApiError &&
                    (e.status === 403 || e.status === 404 || e.status === 422)
                ) {
                    oninaccessible();
                } else {
                    onerror('Failed to verify history head', e);
                }
                return;
            }
            if (!stillCurrent()) return;
            const expected = timeline[0]?.revision ?? 0;

            try {
                const updated = await restoreRevision(resumeId, n, expected);
                if (!stillCurrent()) return;
                onrestored(updated);
            } catch (e) {
                if (!stillCurrent()) return;
                if (e instanceof ApiError && e.status === 401) {
                    onunauthorized();
                } else if (e instanceof ApiError && e.status === 409) {
                    onconflict(e);
                } else {
                    onerror('Restore failed', e);
                }
            }
        } finally {
            restoring = false;
        }
    }
</script>

<section class="panel" aria-label={`Revision ${n}`}>
    <header class="panelHead">
        <div class="headText">
            <h2>Revision #{n}</h2>
            {#if revision}
                <p class="meta">
                    {formatRevisionTimestamp(revision.created_at)} · {revisionActionLabel(
                        revision.action
                    )}{#if revision.is_restore}
                        · restored{/if}
                </p>
            {/if}
        </div>
        <div class="headActions">
            {#if revision}
                <Button
                    variant="secondary"
                    onclick={handleRestore}
                    disabled={restoring}
                    title="Restore the state before this revision"
                >
                    {#snippet icon()}<RotateCcw size={16} />{/snippet}
                    {restoring ? 'Restoring…' : 'Restore'}
                </Button>
            {/if}
            <a
                class="close"
                href="{resolve(`/resumes/${resumeId}/revisions`)}{closeQuery}"
                aria-label="Close revision panel"
            >
                <X size={18} />
            </a>
        </div>
    </header>

    {#if loading}
        <p class="stateText">Loading…</p>
    {:else if notFound}
        <div class="notFound">
            <h3>Revision not found</h3>
            <p>The requested revision does not exist for this resume.</p>
        </div>
    {:else if revision && diff}
        <div class="toggle" role="tablist" aria-label="Revision view">
            <button
                class="toggleBtn"
                class:active={view === 'changes'}
                role="tab"
                aria-selected={view === 'changes'}
                onclick={() => (view = 'changes')}
            >
                Changes
            </button>
            <button
                class="toggleBtn"
                class:active={view === 'state'}
                role="tab"
                aria-selected={view === 'state'}
                onclick={() => (view = 'state')}
            >
                State
            </button>
        </div>

        {#if view === 'changes'}
            <RevisionDiff
                {diff}
                {resumeId}
                {n}
                {onunauthorized}
                {oninaccessible}
                onnotfound={() => (notFound = true)}
                {onerror}
            />
        {:else}
            <RevisionSnapshot snapshot={revision.snapshot} />
        {/if}
    {/if}
</section>

<style>
    .panel {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-card);
        padding: var(--space-5);
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
    }

    .panelHead {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--space-3);
    }

    .panelHead h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 700;
    }

    .meta {
        margin: var(--space-1) 0 0;
        color: var(--color-muted);
        font-size: 13px;
    }

    .headActions {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        flex-shrink: 0;
    }

    .close {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: var(--space-1);
        border-radius: var(--radius-sm);
        color: var(--color-muted);
    }

    .close:hover {
        background: var(--color-background);
        color: var(--color-text);
    }

    .stateText {
        margin: 0;
        color: var(--color-muted);
    }

    .notFound h3 {
        margin: 0 0 var(--space-2);
        font-size: 16px;
    }

    .notFound p {
        margin: 0;
        color: var(--color-muted);
        font-size: 14px;
    }

    .toggle {
        display: inline-flex;
        gap: 0;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        overflow: hidden;
        align-self: flex-start;
    }

    .toggleBtn {
        padding: var(--space-2) var(--space-4);
        border: none;
        background: var(--color-surface);
        color: var(--color-muted);
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
    }

    .toggleBtn + .toggleBtn {
        border-left: 1px solid var(--color-border);
    }

    .toggleBtn.active {
        background: var(--color-primary);
        color: var(--color-surface);
    }

    .toggleBtn:not(.active):hover {
        background: var(--color-background);
        color: var(--color-text);
    }
</style>
