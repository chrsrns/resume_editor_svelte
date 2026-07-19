<script lang="ts">
    let {
        compact = false,
        class: className = '',
        children
    } = $props<{
        compact?: boolean;
        class?: string;
        children: import('svelte').Snippet;
    }>();

    function classes() {
        return ['actions', compact ? 'compact' : '', className].filter(Boolean).join(' ');
    }
</script>

<div class={classes()}>
    {@render children()}
</div>

<style>
    .actions {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
    }

    .actions.compact {
        /* To counter card flex gap */
        margin-top: calc(-1 * var(--space-2-5));
        margin-bottom: calc(-1 * var(--space-2-5));
    }
</style>
