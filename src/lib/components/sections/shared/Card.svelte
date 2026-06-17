<script lang="ts">
    type Variant = 'card' | 'new' | 'no-padding';

    let {
        variant = 'card',
        class: className = '',
        children
    } = $props<{
        variant?: Variant;
        class?: string;
        children: import('svelte').Snippet;
    }>();

    function classes() {
        return ['card', variant === 'card' ? '' : variant, className].filter(Boolean).join(' ');
    }
</script>

<div class={classes()}>
    {@render children()}
</div>

<style>
    .card {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        padding: var(--space-3);
        background: var(--color-background);
        margin-bottom: var(--space-3);
    }

    .card.new {
        background: var(--color-surface);
        border-color: var(--color-muted);
        border-style: dashed;
    }

    .card.no-padding {
        padding: 0;
    }
</style>
