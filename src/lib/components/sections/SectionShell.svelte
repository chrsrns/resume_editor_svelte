<script lang="ts">
    let { title, description, children } = $props<{
        title: string;
        description?: string;
        children: import('svelte').Snippet;
    }>();
</script>

<section class="section">
    <div class="head">
        <div>
            <h2 class="title">{title}</h2>
            {#if description}
                <p class="desc">{description}</p>
            {/if}
        </div>
    </div>
    <div class="body">{@render children()}</div>
</section>

<style>
    .section {
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        background: var(--color-surface);
        padding: var(--space-3);
        margin-top: var(--space-4);
        box-shadow: var(--shadow-card);
    }

    .head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--space-3);
    }

    .title {
        margin: 0;
        font-size: 16px;
    }

    .desc {
        margin: var(--space-1) 0 0;
        color: var(--color-muted);
        font-size: 13px;
    }

    .body {
        margin-top: var(--space-3);
    }
</style>
