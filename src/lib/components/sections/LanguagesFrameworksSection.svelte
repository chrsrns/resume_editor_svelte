<script lang="ts">
    import type { DraftItem } from '$lib/stores/draft';
    import SectionShell from '$lib/components/sections/SectionShell.svelte';
    import Card from '$lib/components/sections/shared/Card.svelte';
    import CardActions from '$lib/components/sections/shared/CardActions.svelte';
    import CollapsibleCard from '$lib/components/sections/shared/CollapsibleCard.svelte';
    import DragHandle from '$lib/components/sections/shared/DragHandle.svelte';
    import FieldsWrap from '$lib/components/sections/shared/FieldsWrap.svelte';
    import NestedList from '$lib/components/sections/shared/NestedList.svelte';
    import SectionMessage from '$lib/components/sections/shared/SectionMessage.svelte';
    import Button from '$lib/components/ui/Button.svelte';
    import TextInput from '$lib/components/ui/TextInput.svelte';
    import Plus from '@lucide/svelte/icons/plus';
    import Trash2 from '@lucide/svelte/icons/trash-2';

    type LanguageDraft = {
        id: number;
        language_name: string;
        display_order: string;
    };

    type FrameworkDraft = {
        id: number;
        framework_name: string;
        display_order: string;
    };

    let {
        drafts,
        frameworks,
        onAddLanguage,
        onUpdateLanguage,
        onRemoveLanguage,
        onAddFramework,
        onUpdateFramework,
        onRemoveFramework,
        onReorder,
        onReorderFrameworks,
        onValidateLanguage,
        onValidateFramework,
        saving
    }: {
        drafts: DraftItem<LanguageDraft>[];
        frameworks: Record<number, DraftItem<FrameworkDraft>[]>;
        onAddLanguage: (draft: Omit<LanguageDraft, 'id' | 'display_order'>) => void;
        onUpdateLanguage: (id: number, partial: Partial<LanguageDraft>) => void;
        onRemoveLanguage: (id: number) => void;
        onAddFramework: (
            languageId: number,
            draft: Omit<FrameworkDraft, 'id' | 'display_order'>
        ) => void;
        onUpdateFramework: (id: number, partial: Partial<FrameworkDraft>) => void;
        onRemoveFramework: (id: number) => void;
        onReorder: (fromId: number, toId: number) => void;
        onReorderFrameworks: (languageId: number, fromId: number, toId: number) => void;
        onValidateLanguage: (id: number) => void;
        onValidateFramework: (id: number) => void;
        saving: boolean;
    } = $props();

    // UI state for the new language form
    let newLanguageName = $state('');

    // UI state for collapsed cards
    let collapsedById = $state<Record<number, boolean>>({});

    // UI state for new framework text
    let newFrameworkText = $state<Record<number, string>>({});

    // Local drag state (UI only, no API calls)
    let draggingId = $state<number | null>(null);
    let dragOverId = $state<number | null>(null);
    let frameworkDragging = $state<{ group: number; id: number } | null>(null);
    let frameworkDragOver = $state<{ group: number; id: number } | null>(null);

    function handleAddLanguage() {
        if (newLanguageName.trim().length === 0) {
            return;
        }
        onAddLanguage({
            language_name: newLanguageName
        });
        newLanguageName = '';
    }

    function handleAddFramework(languageId: number) {
        const text = (newFrameworkText[languageId] ?? '').trim();
        if (text.length === 0) return;
        onAddFramework(languageId, { framework_name: text });
        newFrameworkText = { ...newFrameworkText, [languageId]: '' };
    }

    function handleDragStart(id: number, e: DragEvent) {
        draggingId = id;
        dragOverId = null;
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', String(id));
        }
    }

    function handleDragEnd() {
        draggingId = null;
        dragOverId = null;
    }

    function handleDragOver(id: number, e: DragEvent) {
        if (draggingId == null) return;
        e.preventDefault();
        e.stopPropagation();
        dragOverId = id;
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    }

    function handleDrop(id: number, e: DragEvent) {
        e.preventDefault();
        e.stopPropagation();
        const fromId = draggingId;
        handleDragEnd();
        if (fromId == null || fromId === id) return;
        onReorder(fromId, id);
    }

    function handleHandleKeydown(id: number, e: KeyboardEvent) {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
        e.preventDefault();

        const visibleDrafts = drafts.filter((d: (typeof drafts)[0]) => d._status !== 'deleted');
        const ids = visibleDrafts.map((d: (typeof visibleDrafts)[0]) => d.id);
        const index = ids.indexOf(id);
        if (index === -1) return;
        const nextIndex = e.key === 'ArrowUp' ? index - 1 : index + 1;
        if (nextIndex < 0 || nextIndex >= ids.length) return;
        onReorder(id, ids[nextIndex]);
    }

    function handleFrameworkDragStart(languageId: number, id: number, e: DragEvent) {
        frameworkDragging = { group: languageId, id };
        frameworkDragOver = null;
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', String(id));
        }
    }

    function handleFrameworkDragEnd() {
        frameworkDragging = null;
        frameworkDragOver = null;
    }

    function handleFrameworkDragOver(languageId: number, id: number, e: DragEvent) {
        if (frameworkDragging == null) return;
        e.preventDefault();
        e.stopPropagation();
        frameworkDragOver = { group: languageId, id };
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    }

    function handleFrameworkDrop(languageId: number, id: number, e: DragEvent) {
        e.preventDefault();
        e.stopPropagation();
        const fromItem = frameworkDragging;
        handleFrameworkDragEnd();
        if (fromItem == null || fromItem.id === id) return;
        onReorderFrameworks(languageId, fromItem.id, id);
    }

    function handleFrameworkHandleKeydown(languageId: number, id: number, e: KeyboardEvent) {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
        e.preventDefault();

        const visibleFrameworks = (frameworks[languageId] ?? []).filter(
            (f: (typeof frameworks)[number][number]) => f._status !== 'deleted'
        );
        const ids = visibleFrameworks.map((f: (typeof visibleFrameworks)[0]) => f.id);
        const index = ids.indexOf(id);
        if (index === -1) return;
        const nextIndex = e.key === 'ArrowUp' ? index - 1 : index + 1;
        if (nextIndex < 0 || nextIndex >= ids.length) return;
        onReorderFrameworks(languageId, id, ids[nextIndex]);
    }
</script>

<SectionShell title="Languages & frameworks" description="Languages with nested frameworks.">
    <Card variant="new">
        <FieldsWrap>
            <TextInput
                label="Language"
                bind:value={newLanguageName}
                title="Programming language name (e.g. TypeScript, Rust)."
                onkeydown={(e) => {
                    if (e.key === 'Enter' && newLanguageName.trim().length > 0) {
                        handleAddLanguage();
                    }
                }}
            />
            <Button
                onclick={handleAddLanguage}
                disabled={saving || newLanguageName.trim().length === 0}
            >
                {#snippet icon()}<Plus size={16} />{/snippet}
                Add language
            </Button>
        </FieldsWrap>
    </Card>

    <SectionMessage error={null} loading={false} empty={false}>
        {#each drafts.filter((d: (typeof drafts)[0]) => d._status !== 'deleted') as d (d.id)}
            <CollapsibleCard
                ariaLabel="Language"
                collapsed={collapsedById[d.id] ?? true}
                oncollapsedchange={(next) => (collapsedById = { ...collapsedById, [d.id]: next })}
                draggable
                dragDisabled={saving}
                dragging={draggingId === d.id}
                dragLabel="Reorder language"
                ondragstart={(e) => handleDragStart(d.id, e)}
                ondragend={handleDragEnd}
                onkeydown={(e) => handleHandleKeydown(d.id, e)}
                dropOver={draggingId != null && dragOverId === d.id && draggingId !== d.id}
                ondragover={(e) => handleDragOver(d.id, e)}
                ondrop={(e) => handleDrop(d.id, e)}
            >
                {#snippet titleHeader()}
                    <div>{d.language_name.trim()}</div>
                {/snippet}
                <FieldsWrap style="padding-top: 6px;">
                    <TextInput
                        label="Language"
                        value={d.language_name}
                        oninput={(e) =>
                            onUpdateLanguage(d.id, {
                                language_name: (e.currentTarget as HTMLInputElement).value
                            })}
                        onblur={() => onValidateLanguage(d.id)}
                        title="Language name."
                    />
                </FieldsWrap>
                <CardActions>
                    <Button
                        variant="danger"
                        onclick={() => onRemoveLanguage(d.id)}
                        disabled={saving}
                    >
                        {#snippet icon()}<Trash2 size={16} />{/snippet}
                        Delete
                    </Button>
                </CardActions>

                <FieldsWrap>
                    <TextInput
                        label="Add framework"
                        title="Add a framework/library for this language (e.g. Svelte, Rocket)."
                        value={newFrameworkText[d.id] ?? ''}
                        oninput={(e) =>
                            (newFrameworkText = {
                                ...newFrameworkText,
                                [d.id]: (e.target as HTMLInputElement).value
                            })}
                        onkeydown={(e) => {
                            if (
                                e.key === 'Enter' &&
                                (newFrameworkText[d.id] ?? '').trim().length > 0
                            ) {
                                handleAddFramework(d.id);
                            }
                        }}
                    />
                    <Button
                        onclick={() => handleAddFramework(d.id)}
                        disabled={saving || (newFrameworkText[d.id] ?? '').trim().length === 0}
                    >
                        {#snippet icon()}<Plus size={16} />{/snippet}
                        Add
                    </Button>
                </FieldsWrap>

                <NestedList
                    title="Frameworks"
                    loading={false}
                    empty={(frameworks[d.id] ?? []).filter(
                        (f: (typeof frameworks)[number][number]) => f._status !== 'deleted'
                    ).length === 0}
                    emptyText="No frameworks."
                >
                    {#each (frameworks[d.id] ?? []).filter((f: (typeof frameworks)[number][number]) => f._status !== 'deleted') as f (f.id)}
                        <FieldsWrap
                            role="group"
                            aria-label="Framework"
                            class={frameworkDragging != null &&
                            frameworkDragOver != null &&
                            frameworkDragOver.group === d.id &&
                            frameworkDragOver.id === f.id &&
                            !(frameworkDragging.group === d.id && frameworkDragging.id === f.id)
                                ? 'dropOver'
                                : ''}
                            ondragover={(e) => handleFrameworkDragOver(d.id, f.id, e)}
                            ondrop={(e) => handleFrameworkDrop(d.id, f.id, e)}
                        >
                            <DragHandle
                                ondragstart={(e) => handleFrameworkDragStart(d.id, f.id, e)}
                                ondragend={handleFrameworkDragEnd}
                                onkeydown={(e) => handleFrameworkHandleKeydown(d.id, f.id, e)}
                                disabled={saving}
                                dragging={frameworkDragging != null &&
                                    frameworkDragging.group === d.id &&
                                    frameworkDragging.id === f.id}
                                label="Reorder framework"
                            />
                            <TextInput
                                label="Framework"
                                value={f.framework_name}
                                oninput={(e) =>
                                    onUpdateFramework(f.id, {
                                        framework_name: (e.currentTarget as HTMLInputElement).value
                                    })}
                                onblur={() => onValidateFramework(f.id)}
                                title="Framework/library name."
                            />
                            <Button
                                variant="danger"
                                onclick={() => onRemoveFramework(f.id)}
                                disabled={saving}
                            >
                                {#snippet icon()}<Trash2 size={16} />{/snippet}
                                Delete
                            </Button>
                        </FieldsWrap>
                    {/each}
                </NestedList>
            </CollapsibleCard>
        {/each}
    </SectionMessage>
</SectionShell>
