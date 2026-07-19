<script lang="ts">
    import type { HTMLAttributes } from 'svelte/elements';

    let {
        top = false,
        class: className = '',
        children,
        ...rest
    } = $props<
        {
            top?: boolean;
            class?: string;
            children: import('svelte').Snippet;
        } & HTMLAttributes<HTMLDivElement>
    >();

    function classes() {
        return ['fields', top ? 'top' : '', className].filter(Boolean).join(' ');
    }
</script>

<div {...rest} class={classes()}>
    {@render children()}
</div>

<style>
    .fields {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
        align-items: center;
    }

    .fields.top {
        padding-top: var(--space-1-5);
    }

    .fields.dropOver {
        outline: 2px dashed var(--color-primary);
        outline-offset: 2px;
        border-radius: var(--radius-sm);
    }

    .fields > :global([data-field-width='grow']) {
        flex: 1 1 240px;
        min-width: 180px;
    }

    .fields > :global([data-field-width='small']) {
        flex: 0 1 110px;
        min-width: 90px;
    }

    .fields > :global([data-field-width='date']) {
        flex: 0 1 170px;
        min-width: 150px;
    }

    .fields > :global([data-field-width='content']) {
        flex: 0 1 auto;
        min-width: max-content;
    }
</style>
