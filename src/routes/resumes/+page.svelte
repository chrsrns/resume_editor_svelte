<script lang="ts">
    import { goto } from '$app/navigation';
    import { resolve } from '$app/paths';
    import { listResumes, importResumeMarkdown } from '$lib/api/resumes';
    import type { ApiError } from '$lib/api/client';
    import type { Resume, ResumePage, ListResumesParams } from '$lib/types';
    import { authToken } from '$lib/auth';
    import { currentUser } from '$lib/session';
    import { createRequestSupersession } from '$lib/requestSupersession';
    import Button from '$lib/components/ui/Button.svelte';
    import ErrorDialog from '$lib/components/ui/ErrorDialog.svelte';
    import MarkdownFilePicker from '$lib/components/ui/MarkdownFilePicker.svelte';
    import VariantGroup from '$lib/components/VariantGroup.svelte';
    import VariantRow from '$lib/components/VariantRow.svelte';
    import TextInput from '$lib/components/ui/TextInput.svelte';
    import { mapResumePageEntries, parseSearchTerms } from '$lib/variants';
    import RefreshCw from '@lucide/svelte/icons/refresh-cw';
    import FileUp from '@lucide/svelte/icons/file-up';

    const limit = 20;

    let loading = $state(true);
    let error = $state<string | null>(null);
    let page = $state<ResumePage | null>(null);
    let renderedSearch = $state('');
    let openImport: (() => void) | undefined = $state();
    let importBusy = $state(false);
    let importErrorOpen = $state(false);
    let importErrorTitle = $state('Import failed');
    let importErrorMessage = $state('');
    let query = $state('');
    let activeQuery = $state('');
    let sort = $state<'id' | 'name' | 'updated_at'>('id');
    let order = $state<'asc' | 'desc'>('asc');
    let offset = $state(0);

    const supersession = createRequestSupersession();
    let lastRequestKey = '';

    $effect(() => {
        const pending = query;
        const timer = setTimeout(() => {
            if (pending !== activeQuery) {
                activeQuery = pending;
                offset = 0;
            }
        }, 200);
        return () => clearTimeout(timer);
    });

    const params = $derived<ListResumesParams>({
        limit,
        offset,
        sort,
        order,
        search: activeQuery.trim() || undefined
    });

    async function loadResumes(p: ListResumesParams) {
        const token = supersession.next();
        loading = true;
        try {
            const next = await listResumes(p);
            if (!supersession.current(token)) return;
            page = next;
            renderedSearch = p.search ?? '';
            error = null;
        } catch (e) {
            if (!supersession.current(token)) return;
            const err = e as ApiError;
            error = err.message;
        } finally {
            if (supersession.current(token)) loading = false;
        }
    }

    $effect(() => {
        const key = JSON.stringify(params);
        if (key === lastRequestKey) return;
        lastRequestKey = key;
        void loadResumes(params);
    });

    const listEntries = $derived(
        page ? mapResumePageEntries(page, parseSearchTerms(renderedSearch)) : []
    );
    const renderedSearching = $derived(renderedSearch.length > 0);
    const pageStart = $derived(page && page.items.length > 0 ? page.offset + 1 : 0);
    const pageEnd = $derived(page && page.items.length > 0 ? page.offset + page.items.length : 0);
    const canPrev = $derived((page?.offset ?? 0) > 0);
    const canNext = $derived(page !== null && page.offset + page.items.length < page.total);

    function isOwned(resume: Resume): boolean {
        return $currentUser !== null && resume.created_by === $currentUser.id;
    }

    function prevPage() {
        offset = Math.max(0, offset - limit);
    }

    function nextPage() {
        offset = offset + limit;
    }

    function resetOffset() {
        offset = 0;
    }

    async function handleImportFile(file: File) {
        importBusy = true;
        importErrorOpen = false;
        try {
            const text = await file.text();
            const resume = await importResumeMarkdown(text);
            await goto(resolve('/resumes/[id]/edit', { id: resume.id }));
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
        <p class="muted">Public resumes, plus your unlisted and private resumes when logged in.</p>
    </div>
    <div class="actions">
        {#if $authToken}
            <Button href={resolve('/resumes/new')}>New resume</Button>
            <Button variant="secondary" onclick={() => openImport?.()} disabled={importBusy}>
                {#snippet icon()}<FileUp size={16} />{/snippet}
                Import Markdown
            </Button>
            <MarkdownFilePicker bind:open={openImport} onpick={handleImportFile} />
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

<div class="controls">
    <div class="searchRow">
        <TextInput
            bind:value={query}
            label="Search resumes"
            placeholder="Search resumes"
            aria-label="Search resumes"
        />
    </div>
    <label class="control">
        Sort by
        <select bind:value={sort} onchange={resetOffset} aria-label="Sort field">
            <option value="id">ID</option>
            <option value="name">Name</option>
            <option value="updated_at">Updated</option>
        </select>
    </label>
    <label class="control">
        Order
        <select bind:value={order} onchange={resetOffset} aria-label="Sort order">
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
        </select>
    </label>
</div>

{#if error}
    <p class="error" role="alert">{error}</p>
{:else if page === null}
    <p>Loading…</p>
{:else if page.items.length === 0}
    <p class="muted">
        {#if renderedSearching}No resumes match "{renderedSearch}".{:else}No resumes found.{/if}
    </p>
{:else}
    <ul class="list" aria-busy={loading}>
        {#each listEntries as entry (entry.kind === 'group' ? `group-${entry.base.id}` : `orphan-${entry.resume.id}`)}
            {#if entry.kind === 'group'}
                <VariantGroup
                    base={entry.base}
                    variants={entry.variants}
                    owned={isOwned(entry.base)}
                    matchIds={renderedSearching ? entry.matchIds : undefined}
                />
            {:else}
                <li class="item">
                    <VariantRow resume={entry.resume} orphan owned={isOwned(entry.resume)} />
                </li>
            {/if}
        {/each}
    </ul>
{/if}

{#if page !== null}
    <div class="pager">
        <Button variant="secondary" onclick={prevPage} disabled={!canPrev || loading}>
            Previous
        </Button>
        <span class="muted pageIndicator">
            {pageStart}–{pageEnd} of {page.total}
        </span>
        <Button variant="secondary" onclick={nextPage} disabled={!canNext || loading}>Next</Button>
    </div>
{/if}

<Button variant="secondary" onclick={() => void loadResumes(params)} disabled={loading}>
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

    .controls {
        display: flex;
        align-items: flex-end;
        gap: var(--space-4);
        margin-top: var(--space-4);
        flex-wrap: wrap;
    }

    .searchRow {
        flex: 1 1 16rem;
    }

    .control {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
        font-size: var(--font-size-sm);
        color: var(--color-muted);
    }

    .control select {
        padding: var(--space-1-5) var(--space-2);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        background: var(--color-surface);
        color: inherit;
    }

    .pager {
        display: flex;
        align-items: center;
        gap: var(--space-2-5);
        margin-top: var(--space-4);
    }

    .pageIndicator {
        min-width: 8rem;
        text-align: center;
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
