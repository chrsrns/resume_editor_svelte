<script lang="ts">
    import { resolve } from '$app/paths';
    import { formatRevisionTimestamp, revisionActionLabel } from '$lib/revisions';
    import type { ResumeRevisionSummary } from '$lib/types';
    import History from '@lucide/svelte/icons/history';

    let {
        revisions,
        selectedN,
        resumeId
    }: {
        revisions: ResumeRevisionSummary[];
        selectedN: number | null;
        resumeId: string;
    } = $props();
</script>

<div class="timeline">
    {#if revisions.length === 0}
        <div class="ghost">
            <History size={20} />
            <p>No revisions yet. Edits to this resume will appear here.</p>
        </div>
    {:else}
        <ol class="rows">
            {#each revisions as row (row.revision)}
                <li>
                    <a
                        class="row"
                        class:selected={row.revision === selectedN}
                        href="{resolve(`/resumes/${resumeId}/revisions`)}?n={row.revision}"
                        onclick={(e) => {
                            if (row.revision === selectedN) e.preventDefault();
                        }}
                        aria-current={row.revision === selectedN ? 'true' : undefined}
                    >
                        <span class="rev">#{row.revision}</span>
                        <span class="when">{formatRevisionTimestamp(row.created_at)}</span>
                        <span class="action">{revisionActionLabel(row.action)}</span>
                        {#if row.is_restore}
                            <span class="restoredBadge">restored</span>
                        {/if}
                    </a>
                </li>
            {/each}
        </ol>
    {/if}
</div>

<style>
    .timeline {
        display: flex;
        flex-direction: column;
    }

    .rows {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
    }

    .row {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        flex-wrap: wrap;
        padding: var(--space-3) var(--space-4);
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        text-decoration: none;
        color: var(--color-text);
    }

    .row:hover {
        border-color: var(--color-muted);
    }

    .row.selected {
        border-color: var(--color-primary);
        background: var(--color-primary-light);
    }

    .rev {
        font-weight: 700;
        font-size: 14px;
        min-width: 2.5rem;
    }

    .when {
        color: var(--color-muted);
        font-size: 13px;
    }

    .action {
        font-size: 14px;
    }

    .restoredBadge {
        margin-left: auto;
        padding: var(--space-1) var(--space-2-5);
        border-radius: var(--radius-pill);
        background: var(--color-warning-light);
        color: var(--color-warning-dark);
        font-size: 12px;
        font-weight: 600;
    }

    .ghost {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-3);
        padding: var(--space-8) var(--space-4);
        border: 1px dashed var(--color-border);
        border-radius: var(--radius-md);
        background: var(--color-surface);
        color: var(--color-muted);
        text-align: center;
    }

    .ghost p {
        margin: 0;
        font-size: 14px;
    }
</style>
