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
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        background: white;
        padding: 14px;
        margin-top: 16px;
    }

    .head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
    }

    .title {
        margin: 0;
        font-size: 16px;
    }

    .desc {
        margin: 6px 0 0;
        color: #475569;
        font-size: 13px;
    }

    .body {
        margin-top: 12px;
    }
</style>
