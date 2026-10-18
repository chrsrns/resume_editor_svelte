<script lang="ts">
    import { getRevisionDiff } from '$lib/api/resumes';
    import { ApiError } from '$lib/api/client';
    import { formatChangeValue } from '$lib/revisions';
    import type { ResumeRevisionDiff } from '$lib/types';
    import FileDiff from '@lucide/svelte/icons/file-diff';

    let {
        diff,
        resumeId,
        n,
        onunauthorized,
        oninaccessible,
        onnotfound,
        onerror
    }: {
        diff: ResumeRevisionDiff;
        resumeId: string;
        n: number;
        onunauthorized: () => void;
        oninaccessible: () => void;
        onnotfound: () => void;
        onerror: (title: string, e: unknown) => void;
    } = $props();

    let showUnified = $state(false);
    let unifiedLoading = $state(false);
    let unifiedFetched = $state(false);
    let unifiedText = $state<string | null>(null);

    async function toggleUnified() {
        showUnified = !showUnified;
        if (!showUnified || unifiedFetched) return;
        unifiedLoading = true;
        try {
            const result = await getRevisionDiff(resumeId, n, true);
            unifiedText = result.unified ?? null;
            unifiedFetched = true;
        } catch (e) {
            showUnified = false;
            if (e instanceof ApiError && e.status === 401) {
                onunauthorized();
            } else if (e instanceof ApiError && e.status === 404) {
                onnotfound();
            } else if (
                e instanceof ApiError &&
                (e.status === 403 || e.status === 422)
            ) {
                oninaccessible();
            } else {
                onerror('Failed to load text diff', e);
            }
        } finally {
            unifiedLoading = false;
        }
    }
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

    <button
        class="unifiedToggle"
        type="button"
        aria-expanded={showUnified}
        onclick={toggleUnified}
        disabled={unifiedLoading}
    >
        <FileDiff size={16} />
        {unifiedLoading ? 'Loading…' : showUnified ? 'Hide text diff' : 'Show text diff'}
    </button>

    {#if showUnified && unifiedFetched && unifiedText}
        <pre class="unified">{unifiedText}</pre>
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

    .unifiedToggle {
        display: inline-flex;
        align-items: center;
        gap: var(--space-1-5);
        align-self: flex-start;
        padding: var(--space-2) var(--space-3);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        background: var(--color-surface);
        color: var(--color-text);
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
    }

    .unifiedToggle:hover:not([disabled]) {
        background: var(--color-background);
        border-color: var(--color-muted);
    }

    .unifiedToggle[disabled] {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .unified {
        margin: 0;
        padding: var(--space-4);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        background: var(--color-background);
        font-size: 12px;
        line-height: 1.6;
        overflow-x: auto;
        white-space: pre;
    }

    @media (max-width: 640px) {
        .values {
            grid-template-columns: 1fr;
        }
    }
</style>
