<script lang="ts">
    import { resolve } from '$app/paths';
    import Pencil from '@lucide/svelte/icons/pencil';
    import ChevronLeft from '@lucide/svelte/icons/chevron-left';
    import FileDown from '@lucide/svelte/icons/file-down';
    import Button from '$lib/components/ui/Button.svelte';
    import type { Resume } from '$lib/types';

    let { resume, canEdit, onExport } = $props<{
        resume: Resume;
        canEdit: boolean;
        onExport?: () => void;
    }>();
</script>

<div class="header">
    <div class="profile">
        {#if resume.profile_image_url}
            <div class="imageWrap">
                <img src={resume.profile_image_url} alt={`Profile of ${resume.name}`} />
            </div>
        {:else}
            <div class="imageWrap placeholder">
                <span class="placeholderText">{resume.name.charAt(0).toUpperCase()}</span>
            </div>
        {/if}
        <div class="info">
            <h1>{resume.name}</h1>
        </div>
    </div>
    <div class="actions">
        {#if onExport}
            <Button variant="secondary" onclick={onExport}>
                {#snippet icon()}<FileDown size={16} />{/snippet}
                Export Markdown
            </Button>
        {/if}
        {#if canEdit}
            <Button href={resolve(`/resumes/${resume.id}/edit`)}>
                {#snippet icon()}<Pencil size={16} />{/snippet}
                Edit Resume
            </Button>
        {/if}
        <Button variant="secondary" href={resolve('/resumes')}>
            {#snippet icon()}<ChevronLeft size={16} />{/snippet}
            Back
        </Button>
    </div>
</div>

<style>
    .header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--space-4);
        margin-top: var(--space-6);
        margin-bottom: var(--space-6);
        flex-wrap: wrap;
    }

    .profile {
        display: flex;
        align-items: center;
        gap: var(--space-5);
        flex-wrap: wrap;
    }

    .imageWrap {
        width: 180px;
        height: 180px;
        border-radius: var(--radius-lg);
        overflow: hidden;
        background: var(--color-background);
        border: 1px solid var(--color-border);
        flex-shrink: 0;
    }

    .imageWrap img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
    }

    .placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--color-primary-light);
    }

    .placeholderText {
        font-size: 64px;
        font-weight: 700;
        color: var(--color-primary);
        line-height: 1;
    }

    .info {
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: var(--space-2);
    }

    .info h1 {
        margin: 0;
        font-size: 28px;
        font-weight: 700;
        color: var(--color-text);
    }

    .actions {
        display: flex;
        gap: var(--space-3);
        flex-wrap: wrap;
        align-items: center;
    }

    @media (max-width: 640px) {
        .header {
            flex-direction: column;
            align-items: flex-start;
        }

        .imageWrap {
            width: 140px;
            height: 140px;
        }

        .info h1 {
            font-size: 22px;
        }
    }
</style>
