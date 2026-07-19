<script lang="ts">
    type Size = 'sm' | 'md';

    let {
        active,
        activeLabel = 'Active',
        inactiveLabel = 'Inactive',
        unknownLabel = 'Unknown',
        size = 'md',
        title,
        class: className = '',
        style
    } = $props<{
        active?: boolean | null;
        activeLabel?: string;
        inactiveLabel?: string;
        unknownLabel?: string;
        size?: Size;
        title?: string;
        class?: string;
        style?: string;
    }>();

    function text() {
        if (active === true) return activeLabel;
        if (active === false) return inactiveLabel;
        return unknownLabel;
    }

    function variant() {
        if (active === true) return 'active';
        if (active === false) return 'inactive';
        return 'unknown';
    }

    function classes() {
        return ['activeStatus', size, variant(), className].filter(Boolean).join(' ');
    }
</script>

<span {style} class={classes()} {title}>{text()}</span>

<style>
    .activeStatus {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--radius-pill);
        padding: var(--space-1) var(--space-2-5);
        font-size: 12px;
        line-height: 1;
        border: 1px solid transparent;
        white-space: nowrap;
    }

    .activeStatus.sm {
        padding: var(--space-1) var(--space-2);
        font-size: 11px;
    }

    .activeStatus.md {
        padding: var(--space-1) var(--space-2-5);
        font-size: 12px;
    }

    .activeStatus.active {
        background: var(--color-success-light);
        border-color: var(--color-success);
        color: var(--color-success-dark);
    }

    .activeStatus.inactive {
        background: var(--color-background);
        border-color: var(--color-border);
        color: var(--color-muted);
    }

    .activeStatus.unknown {
        background: var(--color-warning-light);
        border-color: var(--color-warning);
        color: var(--color-warning-dark);
    }
</style>
