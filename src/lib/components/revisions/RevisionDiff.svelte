<script lang="ts">
    import { formatChangeValue } from '$lib/revisions';
    import type { ResumeRevisionDiff } from '$lib/types';

    let {
        diff,
        resumeId,
        n,
        onunauthorized,
        oninaccessible,
        onerror
    }: {
        diff: ResumeRevisionDiff;
        resumeId: string;
        n: number;
        onunauthorized: () => void;
        oninaccessible: () => void;
        onerror: (title: string, e: unknown) => void;
    } = $props();
</script>

<div class="diffView">
    {#if diff.changes.length === 0}
        <p class="empty">No recorded changes — this revision captured identical content.</p>
    {:else}
        <ul class="changes">
            {#each diff.changes as change (change.path)}
                <li class="change">
                    <div class="changeHead">
                        <span class="kind kind-{change.kind}">{change.kind}</span>
                        <code class="path">{change.path}</code>
                    </div>
                    <div class="values">
                        <div class="value">
                            <span class="valueLabel">before</span>
                            <code class="valueText">{formatChangeValue(change.before)}</code>
                        </div>
                        <div class="value">
                            <span class="valueLabel">after</span>
                            <code class="valueText">{formatChangeValue(change.after)}</code>
                        </div>
                    </div>
                </li>
            {/each}
        </ul>
    {/if}
</div>

<style>
    .diffView {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
    }

    .empty {
        margin: 0;
        color: var(--color-muted);
        font-size: 14px;
    }

    .changes {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
    }

    .change {
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        padding: var(--space-3);
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
        background: var(--color-background);
    }

    .changeHead {
        display: flex;
        align-items: center;
        gap: var(--space-2);
    }

    .kind {
        padding: var(--space-1) var(--space-2-5);
        border-radius: var(--radius-pill);
        font-size: 12px;
        font-weight: 600;
        text-transform: capitalize;
    }

    .kind-added {
        background: var(--color-success-light);
        color: var(--color-success-dark);
    }

    .kind-removed {
        background: var(--color-danger-light);
        color: var(--color-danger);
    }

    .kind-changed {
        background: var(--color-warning-light);
        color: var(--color-warning-dark);
    }

    .path {
        font-size: 13px;
        color: var(--color-text);
        word-break: break-all;
    }

    .values {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--space-3);
    }

    .valueLabel {
        display: block;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--color-muted);
        margin-bottom: var(--space-1);
    }

    .valueText {
        font-size: 13px;
        color: var(--color-text);
        word-break: break-all;
        white-space: pre-wrap;
    }

    @media (max-width: 640px) {
        .values {
            grid-template-columns: 1fr;
        }
    }
</style>
