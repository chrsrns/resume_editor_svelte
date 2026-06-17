<script lang="ts">
    type Variant = 'primary' | 'secondary' | 'danger';

    let {
        variant = 'primary',
        type = 'button',
        disabled = false,
        title,
        onclick,
        class: className = '',
        icon,
        children
    } = $props<{
        variant?: Variant;
        type?: 'button' | 'submit' | 'reset';
        disabled?: boolean;
        title?: string;
        onclick?: (event: MouseEvent) => void;
        class?: string;
        icon?: import('svelte').Snippet;
        children: import('svelte').Snippet;
    }>();

    function classes() {
        return ['button', variant === 'primary' ? '' : variant, className]
            .filter(Boolean)
            .join(' ');
    }
</script>

<button class={classes()} {type} {disabled} {title} {onclick}>
    {#if icon}
        <span class="iconWrap">{@render icon()}</span>
    {/if}
    {@render children()}
</button>

<style>
    .button {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 10px 14px;
        border: 1px solid var(--color-primary);
        border-radius: var(--radius-sm);
        background: var(--color-primary);
        color: white;
        cursor: pointer;
        flex: 0 0 auto;
        font-size: 14px;
        font-weight: 500;
        line-height: 1;
    }

    .button:hover:not([disabled]) {
        background: var(--color-primary-dark);
        border-color: var(--color-primary-dark);
    }

    .button.secondary {
        background: white;
        color: var(--color-text);
        border-color: var(--color-border);
    }

    .button.secondary:hover:not([disabled]) {
        background: var(--color-background);
        border-color: var(--color-muted);
    }

    .button.danger {
        border-color: var(--color-danger);
        background: var(--color-danger);
    }

    .button.danger:hover:not([disabled]) {
        background: var(--color-danger-dark);
        border-color: var(--color-danger-dark);
    }

    .button[disabled] {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .iconWrap {
        display: inline-flex;
        align-items: center;
        justify-content: center;
    }
</style>
