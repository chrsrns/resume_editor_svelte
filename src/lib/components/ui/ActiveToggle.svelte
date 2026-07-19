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
    class="activeToggle {active ? 'active' : 'inactive'} {className}"
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
        padding: 10px 14px;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        background: var(--color-surface);
        color: var(--color-text);
        cursor: pointer;
        flex: 0 0 auto;
        font-size: 14px;
        font-weight: 500;
        line-height: 1;
        white-space: nowrap;
    }

    .activeToggle:hover {
        background: var(--color-background);
        border-color: var(--color-muted);
    }

    .activeToggle.active {
        background: var(--color-primary);
        border-color: var(--color-primary);
        color: var(--color-surface);
    }

    .activeToggle.active:hover {
        background: var(--color-primary-dark);
        border-color: var(--color-primary-dark);
    }

    .activeToggle:focus-visible {
        outline: 2px solid var(--color-primary);
        outline-offset: 2px;
    }
</style>
