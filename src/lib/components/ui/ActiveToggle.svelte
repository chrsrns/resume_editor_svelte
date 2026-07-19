<script lang="ts">
    let {
        active = $bindable(),
        title,
        class: className = '',
        style,
        onchange
    } = $props<{
        active: boolean;
        title?: string;
        class?: string;
        style?: string;
        onchange?: (active: boolean) => void;
    }>();

    function toggle() {
        active = !active;
        onchange?.(active);
    }
</script>

<button
    {style}
    class="activeToggle {active ? 'deactivate' : 'activate'} {className}"
    {title}
    onclick={toggle}
    aria-pressed={active}
    type="button"
>
    {active ? 'Deactivate' : 'Activate'}
</button>

<style>
    .activeToggle {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: var(--space-2-5) var(--space-3-5);
        border: 1px solid var(--color-primary);
        border-radius: var(--radius-sm);
        background: var(--color-primary);
        color: var(--color-surface);
        cursor: pointer;
        flex: 0 0 auto;
        font-size: 14px;
        font-weight: 500;
        line-height: 1;
        white-space: nowrap;
    }

    .activeToggle:hover {
        background: var(--color-primary-dark);
        border-color: var(--color-primary-dark);
    }

    .activeToggle.deactivate {
        background: var(--color-surface);
        color: var(--color-text);
        border-color: var(--color-border);
    }

    .activeToggle.deactivate:hover {
        background: var(--color-background);
        border-color: var(--color-muted);
    }

    .activeToggle:focus-visible {
        outline: 2px solid var(--color-primary);
        outline-offset: 2px;
    }
</style>
