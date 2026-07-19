<script lang="ts">
    import CopyButton from '$lib/components/ui/CopyButton.svelte';
    import AlignLeft from '@lucide/svelte/icons/align-left';

    let { summary }: { summary: string | null } = $props();

    const hasSummary = $derived(!!summary && summary.trim().length > 0);
</script>

<div class="summaryCard" class:empty={!hasSummary}>
    <div class="summaryHeader">
        <div class="iconBox">
            <AlignLeft size={18} />
        </div>
        <h3 class="summaryLabel">Summary</h3>
        {#if hasSummary}
            <div class="summaryActions">
                <CopyButton value={summary ?? ''} />
            </div>
        {/if}
    </div>
    {#if hasSummary}
        <div class="summaryBody">
            <p class="summary">{summary}</p>
        </div>
    {:else}
        <p class="summaryBody emptyText">No summary</p>
    {/if}
</div>

<style>
    .summaryCard {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-card);
        padding: var(--space-5);
        margin-bottom: var(--space-4);
    }

    .summaryCard.empty {
        background: var(--color-background);
    }

    .summaryHeader {
        display: flex;
        align-items: center;
        gap: var(--space-3);
    }

    .iconBox {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border-radius: var(--radius-md);
        background: var(--color-primary-light);
        color: var(--color-primary);
        flex-shrink: 0;
    }

    .summaryLabel {
        flex: 1 1 auto;
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: var(--color-text);
    }

    .summaryActions {
        display: flex;
        align-items: center;
        flex-shrink: 0;
    }

    .summaryBody {
        max-height: 12rem;
        overflow-y: auto;
        font-size: 14px;
        line-height: 1.5;
        color: var(--color-text);
    }

    .summary {
        margin: 0;
        white-space: pre-line;
    }

    .emptyText {
        margin: 0;
        color: var(--color-muted);
    }
</style>
