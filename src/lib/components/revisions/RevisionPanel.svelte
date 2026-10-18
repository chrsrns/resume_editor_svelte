<script lang="ts">
    import X from '@lucide/svelte/icons/x';

    let {
        resumeId,
        n,
        closeHref
    }: {
        resumeId: string;
        n: number;
        closeHref: string;
    } = $props();
</script>

<section class="panel" aria-label={`Revision ${n}`}>
    <header class="panelHead">
        <h2>Revision #{n}</h2>
        <a class="close" href={closeHref} aria-label="Close revision panel">
            <X size={18} />
        </a>
    </header>
    <p class="stateText">Loading…</p>
</section>

<style>
    .panel {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-card);
        padding: var(--space-5);
    }

    .panelHead {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-3);
    }

    .panelHead h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 700;
    }

    .close {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: var(--space-1);
        border-radius: var(--radius-sm);
        color: var(--color-muted);
    }

    .close:hover {
        background: var(--color-background);
        color: var(--color-text);
    }

    .stateText {
        margin: var(--space-4) 0 0;
        color: var(--color-muted);
    }
</style>
