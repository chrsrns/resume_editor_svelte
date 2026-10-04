<script lang="ts">
    import { resolve } from '$app/paths';
    import { ChevronDown, Plus } from '@lucide/svelte';
    import type { Resume } from '$lib/types';
    import { sortVariants } from '$lib/variants';
    import Button from './ui/Button.svelte';
    import VariantRow from './VariantRow.svelte';

    let { base, variants, owned = false } = $props<{
        base: Resume;
        variants: Resume[];
        owned?: boolean;
    }>();

    let collapsed = $state(false);
    let showAll = $state(false);

    const sortedVariants = $derived(sortVariants(variants));
    const visibleVariants = $derived(showAll ? sortedVariants : sortedVariants.slice(0, 3));
    const variantCountLabel = $derived(
        variants.length === 0 ? 'no variants' : `${variants.length} variant${variants.length === 1 ? '' : 's'}`
    );
    const variantsListId = $derived(`resume-${base.id}-variants`);
</script>

<li class="variantGroup">
    <div class="groupHeader" class:noDisclosure={variants.length === 0}>
        {#if variants.length > 0}
            <button
                class="disclosure"
                type="button"
                aria-expanded={!collapsed}
                aria-controls={variantsListId}
                aria-label={`Toggle variants for ${base.name}`}
                onclick={() => (collapsed = !collapsed)}
            >
                <ChevronDown size={16} class={collapsed ? 'collapsedIcon' : ''} />
            </button>
        {/if}
        <a class="baseLink" href={resolve('/resumes/[id]', { id: base.id.toString() })}>
            <div class="titleLine">
                <span class="itemTitle">{base.name}</span>
                <span class="tag {base.is_public ? 'public' : 'private'}">
                    {base.is_public ? 'Public' : 'Private'}
                </span>
                {#if owned}
                    <span class="tag mine">Mine</span>
                {/if}
            </div>
            <div class="meta">{base.email}</div>
        </a>
        {#if owned}
            <div class="headerActions">
                <span class="variantCount">{variantCountLabel}</span>
                <Button href={resolve(`/resumes/${base.id}/variants/new`)}>
                    {#snippet icon()}
                        <Plus size={16} />
                    {/snippet}
                    New variant
                </Button>
            </div>
        {/if}
    </div>

    {#if !collapsed && variants.length > 0}
        <ul class="variantList" id={variantsListId}>
            {#each visibleVariants as variant (variant.id)}
                <li>
                    <VariantRow resume={variant} {owned} />
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
    {/if}
</li>

<style>
    .variantGroup {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-card);
        overflow: hidden;
    }

    .groupHeader {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        padding-right: var(--space-3);
    }

    .noDisclosure {
        padding-left: var(--space-3);
    }

    .disclosure {
        align-items: center;
        align-self: stretch;
        background: transparent;
        border: 0;
        color: var(--color-muted);
        cursor: pointer;
        display: inline-flex;
        justify-content: center;
        padding: 0 var(--space-2);
    }

    .disclosure:hover {
        color: var(--color-primary);
    }

    .disclosure:focus-visible {
        outline: 2px solid var(--color-primary);
        outline-offset: -2px;
    }

    :global(.collapsedIcon) {
        transform: rotate(-90deg);
    }

    .baseLink {
        color: inherit;
        display: block;
        flex: 1 1 auto;
        min-width: 0;
        padding: var(--space-3) 0;
        text-decoration: none;
    }

    .baseLink:hover {
        color: var(--color-primary);
    }

    .baseLink:focus-visible {
        outline: 2px solid var(--color-primary);
        outline-offset: -2px;
    }

    .titleLine {
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
    }

    .itemTitle {
        font-weight: 600;
    }

    .tag {
        border-radius: var(--radius-pill);
        font-size: 12px;
        line-height: 1;
        padding: var(--space-1) var(--space-2);
        white-space: nowrap;
    }

    .tag.public {
        background: var(--color-success-light);
        color: var(--color-success-dark);
    }

    .tag.private {
        background: var(--color-warning-light);
        color: var(--color-warning-dark);
    }

    .tag.mine {
        background: var(--color-primary-light);
        color: var(--color-primary);
    }

    .meta {
        color: var(--color-muted);
        font-size: 13px;
        margin-top: var(--space-1);
    }

    .headerActions {
        align-items: center;
        display: flex;
        flex: 0 0 auto;
        gap: var(--space-2);
    }

    .variantCount {
        color: var(--color-muted);
        font-size: 13px;
        white-space: nowrap;
    }

    .variantList {
        border-top: 1px solid var(--color-border);
        list-style: none;
        margin: 0;
        padding: 0;
    }

    .variantList li + li {
        border-top: 1px solid var(--color-border);
    }

    .showAllRow {
        border-top: 1px solid var(--color-border);
        padding: var(--space-2) var(--space-3) var(--space-3) var(--space-8);
    }
</style>
