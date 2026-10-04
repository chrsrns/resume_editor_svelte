<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { resolve } from '$app/paths';
    import { listResumes, importResumeMarkdown } from '$lib/api/resumes';
    import type { ApiError } from '$lib/api/client';
    import type { Resume } from '$lib/types';
    import { authToken } from '$lib/auth';
    import { currentUser } from '$lib/session';
    import Button from '$lib/components/ui/Button.svelte';
    import ErrorDialog from '$lib/components/ui/ErrorDialog.svelte';
    import VariantGroup from '$lib/components/VariantGroup.svelte';
    import VariantRow from '$lib/components/VariantRow.svelte';
    import { buildResumeListEntries } from '$lib/variants';
    import RefreshCw from '@lucide/svelte/icons/refresh-cw';
    import FileUp from '@lucide/svelte/icons/file-up';

    let loading = $state(true);
    let error = $state<string | null>(null);
    let resumes = $state<Resume[]>([]);
    let importInput: HTMLInputElement | null = $state(null);
    let importBusy = $state(false);
    let importErrorOpen = $state(false);
    let importErrorTitle = $state('Import failed');
    let importErrorMessage = $state('');

    const listEntries = $derived(buildResumeListEntries(resumes));

    function isOwned(resume: Resume): boolean {
        return $currentUser !== null && resume.created_by === $currentUser.id;
    }

    async function loadResumes() {
        loading = true;
        error = null;
        try {
            resumes = await listResumes();
        } catch (e) {
            const err = e as ApiError;
            error = err.message;
        } finally {
            loading = false;
        }
    }

    onMount(() => {
        void loadResumes();
    });

    function triggerImport() {
        importInput?.click();
    }

    async function handleImportFile(e: Event) {
        const input = e.currentTarget as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;
        input.value = '';

        importBusy = true;
        importErrorOpen = false;
        try {
            const text = await file.text();
            const resume = await importResumeMarkdown(text);
            await goto(resolve('/resumes/[id]/edit', { id: resume.id.toString() }));
        } catch (err) {
            const e = err as ApiError;
            importErrorTitle = 'Import failed';
            importErrorMessage = e.message;
            importErrorOpen = true;
        } finally {
            importBusy = false;
        }
    }

    function closeImportError() {
        importErrorOpen = false;
    }
</script>

<svelte:head>
    <title>Resumes - Resume Editor</title>
</svelte:head>

<div class="header">
    <div>
        <h1>Resumes</h1>
        <p class="muted">Public resumes, plus your private resumes when logged in.</p>
    </div>
    <div class="actions">
        {#if $authToken}
            <Button href={resolve('/resumes/new')}>New resume</Button>
            <Button variant="secondary" onclick={triggerImport} disabled={importBusy}>
                {#snippet icon()}<FileUp size={16} />{/snippet}
                Import Markdown
            </Button>
            <input
                bind:this={importInput}
                type="file"
                accept=".md,text/markdown"
                onchange={handleImportFile}
                class="hidden-file-input"
            />
        {:else}
            <Button href={resolve('/auth/login')}>Login to create</Button>
        {/if}
    </div>
</div>

<ErrorDialog
    open={importErrorOpen}
    title={importErrorTitle}
    message={importErrorMessage}
    onclose={closeImportError}
/>

{#if loading}
    <p>Loading…</p>
{:else if error}
    <p class="error">{error}</p>
{:else if resumes.length === 0}
    <p class="muted">No resumes found.</p>
{:else}
    <ul class="list">
        {#each listEntries as entry (entry.kind === 'group' ? `group-${entry.base.id}` : `orphan-${entry.resume.id}`)}
            {#if entry.kind === 'group'}
                <VariantGroup
                    base={entry.base}
                    variants={entry.variants}
                    owned={isOwned(entry.base)}
                />
            {:else}
                <li class="item">
                    <VariantRow resume={entry.resume} orphan owned={isOwned(entry.resume)} />
                </li>
            {/if}
        {/each}
    </ul>
{/if}

<Button variant="secondary" onclick={loadResumes} disabled={loading}>
    {#snippet icon()}<RefreshCw size={16} />{/snippet}
    Refresh
</Button>

<style>
    .header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--space-4);
    }

    .actions {
        display: flex;
        gap: var(--space-2-5);
        align-items: center;
        flex-wrap: wrap;
    }

    .hidden-file-input {
        display: none;
    }

    .list {
        list-style: none;
        padding: 0;
        margin: var(--space-4) 0;
        display: grid;
        gap: var(--space-2-5);
    }

    .item {
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        background: var(--color-surface);
        overflow: hidden;
    }

    .error {
        color: var(--color-danger);
    }

    .muted {
        color: var(--color-muted);
    }
</style>
