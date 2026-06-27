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
            <a class="button" href={resolve('/resumes/new')}>New resume</a>
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
            <a class="button" href={resolve('/auth/login')}>Login to create</a>
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
        {#each resumes as r (r.id)}
            <li class="item">
                <a class="itemLink" href={resolve('/resumes/[id]', { id: r.id.toString() })}>
                    <div class="titleRow">
                        <strong>{r.name}</strong>
                        {#if r.is_public}
                            <span class="tag">Public</span>
                        {:else}
                            <span class="tag private">Private</span>
                        {/if}
                        {#if $currentUser && r.created_by === $currentUser.id}
                            <span class="tag mine">Mine</span>
                        {/if}
                    </div>
                    <div class="meta">{r.email}</div>
                </a>
            </li>
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
        gap: 16px;
    }

    .actions {
        display: flex;
        gap: 10px;
        align-items: center;
        flex-wrap: wrap;
    }

    .hidden-file-input {
        display: none;
    }

    .button {
        padding: 10px 14px;
        border: 1px solid #0f172a;
        border-radius: 8px;
        background: #0f172a;
        color: white;
        text-decoration: none;
    }

    .list {
        list-style: none;
        padding: 0;
        margin: 16px 0;
        display: grid;
        gap: 10px;
    }

    .item {
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        background: white;
    }

    .itemLink {
        display: block;
        padding: 12px 14px;
        color: inherit;
        text-decoration: none;
    }

    .titleRow {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
    }

    .meta {
        color: #475569;
        font-size: 13px;
        margin-top: 4px;
    }

    .tag {
        font-size: 12px;
        padding: 2px 8px;
        border-radius: 999px;
        background: #e2e8f0;
        color: #0f172a;
    }

    .tag.private {
        background: #fee2e2;
        color: #7f1d1d;
    }

    .tag.mine {
        background: #dcfce7;
        color: #14532d;
    }

    .error {
        color: #b91c1c;
    }

    .muted {
        color: #475569;
    }
</style>
