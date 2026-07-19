<script lang="ts">
    type Variant = 'primary' | 'secondary' | 'danger';

    let {
        variant = 'primary',
        type = 'button',
        disabled = false,
        title,
        href,
        onclick,
        class: className = '',
        icon,
        children
    } = $props<{
        variant?: Variant;
        type?: 'button' | 'submit' | 'reset';
        disabled?: boolean;
        title?: string;
        href?: string;
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

{#if href}
    <a class={classes()} {href} {title} {onclick}>
        {#if icon}
            <span class="iconWrap">{@render icon()}</span>
        {/if}
        {@render children()}
    </a>
{:else}
    <button class={classes()} {type} {disabled} {title} {onclick}>
        {#if icon}
            <span class="iconWrap">{@render icon()}</span>
        {/if}
        {@render children()}
    </button>
{/if}

<style>
    .button {
        display: inline-flex;
        align-items: center;
        gap: var(--space-1-5);
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
        text-decoration: none;
    }

    .button:hover:not([disabled]) {
        background: var(--color-primary-dark);
        border-color: var(--color-primary-dark);
    }

    .button:focus-visible {
        outline: 2px solid var(--color-primary);
        outline-offset: 2px;
    }

    .button.secondary {
        background: var(--color-surface);
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
