<script lang="ts">
    import { onMount } from 'svelte';
    import type { ApiError } from '$lib/api/client';
    import { listVariants } from '$lib/api/resumes';
    import type { Resume } from '$lib/types';
    import Button from './ui/Button.svelte';
    import VariantRow from './VariantRow.svelte';
    import RefreshCw from '@lucide/svelte/icons/refresh-cw';

    let { resumeId } = $props<{
        resumeId: number;
    }>();

    let variants = $state<Resume[]>([]);
    let loading = $state(true);
    let error = $state<string | null>(null);
    let showAll = $state(false);

    const visibleVariants = $derived(showAll ? variants : variants.slice(0, 3));

    async function load() {
        loading = true;
        error = null;
        try {
            variants = await listVariants(resumeId);
        } catch (e) {
            error = (e as ApiError).message;
        } finally {
            loading = false;
        }
    }

    onMount(() => {
        void load();
    });
</script>

{#if loading}
    <section class="variantsCard" aria-label="Variants">
        <p class="state">Loading variants…</p>
    </section>
{:else if error}
    <section class="variantsCard" aria-label="Variants">
        <p class="error">{error}</p>
        <Button variant="secondary" onclick={load}>
            {#snippet icon()}<RefreshCw size={16} />{/snippet}
            Retry
        </Button>
    </section>
{:else if variants.length > 0}
    <section class="variantsCard" aria-label="Variants">
        <h3>Variants of this resume ({variants.length})</h3>
        <ul class="variantList">
            {#each visibleVariants as variant (variant.id)}
                <li>
                    <VariantRow resume={variant} owned />
                </li>
            {/each}
        </ul>
        {#if !showAll && variants.length > 3}
            <div class="showAllRow">
                <Button variant="secondary" onclick={() => (showAll = true)}>
                    Show all ({variants.length})…
                </Button>
            </div>
        {/if}
    </section>
{/if}

<style>
    .variantsCard {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-card);
        margin-bottom: var(--space-4);
        padding: var(--space-4);
    }

    .variantsCard h3 {
        font-size: 15px;
        margin: 0 0 var(--space-3);
    }

    .variantList {
        list-style: none;
        margin: 0;
        padding: 0;
    }

    .variantList li + li {
        border-top: 1px solid var(--color-border);
    }

    .variantList :global(.variantLink) {
        padding-left: var(--space-2);
    }

    .showAllRow {
        margin-top: var(--space-3);
    }

    .state {
        color: var(--color-muted);
        margin: 0;
    }

    .error {
        color: var(--color-danger);
        margin: 0 0 var(--space-3);
    }
</style>
