<script lang="ts">
    import Button from './Button.svelte';
    import X from '@lucide/svelte/icons/x';
    import CheckCircle from '@lucide/svelte/icons/check-circle';
    import AlertCircle from '@lucide/svelte/icons/alert-circle';

    let {
        open,
        success,
        message,
        errors = [],
        onclose,
        onretry
    }: {
        open: boolean;
        success: boolean;
        message: string;
        errors?: Array<{ section: string; error: string }>;
        onclose?: () => void;
        onretry?: () => void;
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
        <div class="popup" role="dialog" aria-modal="true" aria-labelledby="popup-title">
            <div class="popup-header">
                <h2 id="popup-title">
                    {#if success}
                        <span class="icon success"><CheckCircle size={20} /></span>
                        Changes Saved
                    {:else}
                        <span class="icon error"><AlertCircle size={20} /></span>
                        Save Failed
                    {/if}
                </h2>
                <button class="close-button" onclick={onclose} aria-label="Close">
                    <X size={20} />
                </button>
            </div>

            <div class="popup-content">
                <p class="message">{message}</p>

                {#if errors.length > 0}
                    <div class="errors">
                        <h3>Errors ({errors.length})</h3>
                        <ul>
                            {#each errors as error}
                                <li>
                                    <strong>{error.section}:</strong>
                                    {error.error}
                                </li>
                            {/each}
                        </ul>
                    </div>
                {/if}
            </div>

            <div class="popup-footer">
                {#if !success && onretry}
                    <Button variant="primary" onclick={onretry}>Retry</Button>
                {/if}
                <Button variant="secondary" onclick={onclose}>
                    {success ? 'Close' : 'Dismiss'}
                </Button>
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
        background: var(--color-overlay);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: var(--space-4);
    }

    .popup {
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

    .popup-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--space-4);
        border-bottom: 1px solid var(--color-border);
    }

    .popup-header h2 {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        margin: 0;
        font-size: 18px;
        font-weight: 600;
    }

    .icon {
        flex-shrink: 0;
    }

    .icon.success {
        color: var(--color-success);
    }

    .icon.error {
        color: var(--color-danger);
    }

    .close-button {
        background: none;
        border: none;
        color: var(--color-muted);
        cursor: pointer;
        padding: var(--space-1);
        border-radius: var(--radius-sm);
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .close-button:hover {
        background: var(--color-background);
        color: var(--color-text);
    }

    .close-button:focus-visible {
        outline: 2px solid var(--color-primary);
        outline-offset: 2px;
    }

    .popup-content {
        padding: var(--space-4);
        overflow-y: auto;
        flex: 1;
    }

    .message {
        margin: 0 0 var(--space-4) 0;
        color: var(--color-text);
    }

    .errors {
        background: var(--color-background);
        border: 1px solid var(--color-danger);
        border-radius: var(--radius-sm);
        padding: var(--space-3);
    }

    .errors h3 {
        margin: 0 0 var(--space-2) 0;
        font-size: 14px;
        font-weight: 600;
        color: var(--color-danger);
        display: flex;
        align-items: center;
        gap: var(--space-1);
    }

    .errors ul {
        margin: 0;
        padding-left: var(--space-4);
        font-size: 13px;
    }

    .errors li {
        margin-bottom: var(--space-2);
    }

    .errors li:last-child {
        margin-bottom: 0;
    }

    .popup-footer {
        display: flex;
        justify-content: flex-end;
        gap: var(--space-2);
        padding: var(--space-4);
        border-top: 1px solid var(--color-border);
    }
</style>
