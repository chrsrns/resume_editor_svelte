<script lang="ts">
    import GripVertical from '@lucide/svelte/icons/grip-vertical';

    let {
        disabled = false,
        dragging = false,
        label = 'Reorder',
        variant = 'default',
        class: className = '',
        onclick,
        ondragstart,
        ondragend,
        onkeydown
    } = $props<{
        disabled?: boolean;
        dragging?: boolean;
        label?: string;
        variant?: 'default' | 'bare';
        class?: string;
        onclick?: (e: MouseEvent) => void;
        ondragstart?: (e: DragEvent) => void;
        ondragend?: (e: DragEvent) => void;
        onkeydown?: (e: KeyboardEvent) => void;
    }>();

    function classes() {
        return [
            'handle',
            variant,
            dragging ? 'dragging' : '',
            disabled ? 'disabled' : '',
            className
        ]
            .filter(Boolean)
            .join(' ');
    }
</script>

<div
    class={classes()}
    role="button"
    tabindex={disabled ? -1 : 0}
    aria-label={label}
    draggable={!disabled}
    {onclick}
    {ondragstart}
    {ondragend}
    {onkeydown}
>
    <GripVertical size={20} aria-hidden="true" />
</div>

<style>
    .handle {
        width: 30px;
        height: 30px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        background: var(--color-surface);
        color: var(--color-muted);
        cursor: grab;
        user-select: none;
        flex: 0 0 auto;
    }

    .handle.bare {
        width: 20px;
        border: none;
        background: transparent;
        color: var(--color-muted);
    }

    .handle:focus-visible {
        outline: 2px solid var(--color-primary);
        outline-offset: 2px;
    }

    .handle.dragging {
        opacity: 0.7;
        cursor: grabbing;
    }

    .handle.disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
</style>
