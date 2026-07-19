<script lang="ts">
    import Copy from '@lucide/svelte/icons/copy';
    import Check from '@lucide/svelte/icons/check';

    let { value } = $props<{ value: string }>();

    let copied = $state(false);
    let timeoutId = $state<ReturnType<typeof setTimeout> | null>(null);

    async function handleClick() {
        try {
            await navigator.clipboard.writeText(value);
            copied = true;
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                copied = false;
            }, 1500);
        } catch {
            // ignore
        }
    }
</script>

<button class="copyButton" type="button" title={copied ? 'Copied!' : 'Copy'} onclick={handleClick}>
    {#if copied}
        <Check size={14} />
    {:else}
        <Copy size={14} />
    {/if}
</button>

<style>
    .copyButton {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        padding: 0;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        background: var(--color-surface);
        color: var(--color-muted);
        cursor: pointer;
        flex-shrink: 0;
    }

    .copyButton:hover {
        border-color: var(--color-primary);
        color: var(--color-primary);
        background: var(--color-primary-light);
    }

    .copyButton:focus-visible {
        outline: 2px solid var(--color-primary);
        outline-offset: 2px;
    }
</style>
