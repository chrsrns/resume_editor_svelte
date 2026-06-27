<script lang="ts">
    import Button from './Button.svelte';
    import X from '@lucide/svelte/icons/x';
    import AlertCircle from '@lucide/svelte/icons/alert-circle';

    let {
        open,
        title,
        message,
        onclose
    }: {
        open: boolean;
        title: string;
        message: string;
        onclose?: () => void;
    } = $props();

    function handleBackdropClick(e: MouseEvent) {
        if (e.target === e.currentTarget) {
            onclose?.();
        }
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            onclose?.();
        }
    }
</script>

{#if open}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="overlay" onclick={handleBackdropClick} onkeydown={handleKeydown}>
        <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
            <div class="dialog-header">
                <h2 id="dialog-title">
                    <span class="icon"><AlertCircle size={20} /></span>
                    {title}
                </h2>
                <button class="close-button" onclick={onclose} aria-label="Close">
                    <X size={20} />
                </button>
            </div>

            <div class="dialog-content">
                <p class="message">{message}</p>
            </div>

            <div class="dialog-footer">
                <Button variant="secondary" onclick={onclose}>Close</Button>
            </div>
        </div>
    </div>
{/if}

<style>
    .overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: var(--space-4);
    }

    .dialog {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-card);
        max-width: 500px;
        width: 100%;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
    }

    .dialog-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--space-4);
        border-bottom: 1px solid var(--color-border);
    }

    .dialog-header h2 {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: var(--color-danger);
    }

    .icon {
        flex-shrink: 0;
    }

    .close-button {
        background: none;
        border: none;
        color: var(--color-muted);
        cursor: pointer;
        padding: 4px;
        border-radius: var(--radius-sm);
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .close-button:hover {
        background: var(--color-background);
        color: var(--color-text);
    }

    .dialog-content {
        padding: var(--space-4);
        overflow-y: auto;
        flex: 1;
    }

    .message {
        margin: 0;
        color: var(--color-text);
        white-space: pre-wrap;
    }

    .dialog-footer {
        display: flex;
        justify-content: flex-end;
        gap: var(--space-2);
        padding: var(--space-4);
        border-top: 1px solid var(--color-border);
    }
</style>
