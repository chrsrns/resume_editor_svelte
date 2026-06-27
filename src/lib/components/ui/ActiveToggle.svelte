<script lang="ts">
    let {
        active = $bindable(),
        size = 'md',
        title,
        class: className = '',
        style,
        onchange
    } = $props<{
        active: boolean;
        size?: 'sm' | 'md';
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
    class="activeToggle {size} {active ? 'active' : 'inactive'} {className}"
    {title}
    onclick={toggle}
    aria-pressed={active}
    type="button"
>
    {active ? 'Active' : 'Inactive'}
</button>

<style>
    .activeToggle {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--radius-pill);
        padding: 4px 10px;
        font-size: 12px;
        line-height: 1;
        border: 1px solid transparent;
        white-space: nowrap;
        cursor: pointer;
        background: none;
    }

    .activeToggle.sm {
        padding: 3px 8px;
        font-size: 11px;
    }

    .activeToggle.md {
        padding: 4px 10px;
        font-size: 12px;
    }

    .activeToggle.active {
        background: #dcfce7;
        border-color: #16a34a;
        color: #166534;
    }

    .activeToggle.inactive {
        background: var(--color-background);
        border-color: var(--color-border);
        color: var(--color-muted);
    }
</style>
