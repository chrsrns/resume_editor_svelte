<script lang="ts">
    import type { HTMLAttributes } from 'svelte/elements';

    let {
        class: className = '',
        children,
        ...rest
    } = $props<
        {
            class?: string;
            children: import('svelte').Snippet;
        } & HTMLAttributes<HTMLDivElement>
    >();

    function classes() {
        return ['fields', className].filter(Boolean).join(' ');
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

    .fields.dropOver {
        outline: 2px dashed var(--color-primary);
        outline-offset: 2px;
        border-radius: var(--radius-sm);
    }

    .fields > :global(.uiField:not(.small):not(.date)),
    .fields > :global(.input:not(.small)) {
        flex: 1 1 240px;
        min-width: 180px;
    }

    .fields > :global(.uiField.small),
    .fields > :global(.input.small) {
        flex: 0 1 110px;
        min-width: 90px;
    }

    .fields > :global(.uiField.date),
    .fields > :global(input[type='date'].input) {
        flex: 0 1 170px;
        min-width: 150px;
    }
</style>
