<script lang="ts">
    import { resolve } from '$app/paths';
    import type { Resume } from '$lib/types';
    import { formatVariantTargetDate, variantPrimaryText } from '$lib/variants';

    let { resume, orphan = false, owned = false } = $props<{
        resume: Resume;
        orphan?: boolean;
        owned?: boolean;
    }>();

    const title = $derived(orphan ? resume.name : variantPrimaryText(resume));
    const targetDate = $derived(formatVariantTargetDate(resume.target_date));
</script>

<a
    class="variantLink"
    class:orphan
    href={resolve('/resumes/[id]', { id: resume.id.toString() })}
>
    {#if !orphan}
        <span class="nestArrow" aria-hidden="true">↳</span>
    {/if}
    <div class="variantContent">
        <div class="titleLine">
            <span class="itemTitle">{title}</span>
            {#if orphan}
                <span class="tag variantTag">variant</span>
            {/if}
            {#if resume.role_title}
                <span class="badge">{resume.role_title}</span>
            {/if}
            {#if targetDate}
                <span class="badge">{targetDate}</span>
            {/if}
            {#if resume.variant_label}
                <span class="badge">{resume.variant_label}</span>
            {/if}
            <span class="tag {resume.is_public ? 'public' : 'private'}">
                {resume.is_public ? 'Public' : 'Private'}
            </span>
            {#if owned}
                <span class="tag mine">Mine</span>
            {/if}
        </div>
        <div class="meta">{resume.email}</div>
    </div>
</a>

<style>
    .variantLink {
        display: flex;
        align-items: flex-start;
        gap: var(--space-2);
        padding: var(--space-3) var(--space-3) var(--space-3) var(--space-8);
        color: inherit;
        text-decoration: none;
    }

    .variantLink:hover {
        background: var(--color-primary-light);
    }

    .variantLink:focus-visible {
        outline: 2px solid var(--color-primary);
        outline-offset: -2px;
    }

    .variantLink.orphan {
        padding-left: var(--space-3);
    }

    .nestArrow {
        color: var(--color-muted);
        flex: 0 0 auto;
        line-height: 1.4;
    }

    .variantContent {
        min-width: 0;
    }

    .titleLine {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: var(--space-2);
    }

    .itemTitle {
        font-weight: 600;
    }

    .badge,
    .tag {
        border-radius: var(--radius-pill);
        font-size: 12px;
        line-height: 1;
        padding: var(--space-1) var(--space-2);
        white-space: nowrap;
    }

    .badge {
        background: var(--color-primary-light);
        color: var(--color-primary-dark);
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

    .variantTag {
        background: var(--color-primary-light);
        color: var(--color-primary-dark);
    }

    .meta {
        color: var(--color-muted);
        font-size: 13px;
        margin-top: var(--space-1);
    }
</style>
