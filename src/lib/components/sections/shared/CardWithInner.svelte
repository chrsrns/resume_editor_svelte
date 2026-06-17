<script lang="ts">
    import Card from '$lib/components/sections/shared/Card.svelte';

    type Variant = 'card' | 'new';

    let {
        variant = 'card',
        class: className = '',
        innerClass = '',
        ariaLabel,
        role = 'group',
        dropOver = false,
        ondragover,
        ondrop,
        children
    } = $props<{
        variant?: Variant;
        class?: string;
        innerClass?: string;
        ariaLabel: string;
        role?: string;
        dropOver?: boolean;
        ondragover?: (e: DragEvent) => void;
        ondrop?: (e: DragEvent) => void;
        children: import('svelte').Snippet;
    }>();

    function innerClasses() {
        return ['cardInner', innerClass].filter(Boolean).join(' ');
    }
</script>

<Card {variant} class={className}>
    <div class={innerClasses()} {role} aria-label={ariaLabel} class:dropOver {ondragover} {ondrop}>
        {@render children()}
    </div>
</Card>

<style>
    .cardInner {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .cardInner.dropOver {
        outline: 2px dashed #0f172a;
        outline-offset: 4px;
    }
</style>
