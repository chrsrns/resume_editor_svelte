<script lang="ts">
    let {
        title,
        loading = false,
        empty = false,
        emptyText = 'No items.',
        children
    } = $props<{
        title: string;
        loading?: boolean;
        empty?: boolean;
        emptyText?: string;
        children: import('svelte').Snippet;
    }>();
</script>

<div class="nested">
    <div class="nestedHead">
        <strong>{title}</strong>
        {#if loading}
            <span class="muted">Loading…</span>
        {/if}
    </div>

    {#if empty}
        <p class="muted">{emptyText}</p>
    {:else}
        <div class="nestedBody">{@render children()}</div>
    {/if}
</div>

<style>
    .nested {
        padding-top: var(--space-2);
        border-top: 1px solid var(--color-border);
    }

    .nestedHead {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-2);
        margin-bottom: var(--space-2);
    }

    .nestedBody {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
    }

    .muted {
        color: var(--color-muted);
        margin: 0;
    }
</style>
