<script lang="ts">
    import type { DraftItem } from '$lib/stores/draft';
    import SectionShell from '$lib/components/sections/SectionShell.svelte';
    import Card from '$lib/components/sections/shared/Card.svelte';
    import CardActions from '$lib/components/sections/shared/CardActions.svelte';
    import CollapsibleCard from '$lib/components/sections/shared/CollapsibleCard.svelte';
    import FieldsWrap from '$lib/components/sections/shared/FieldsWrap.svelte';
    import ChildItemListEditor from '$lib/components/sections/shared/ChildItemListEditor.svelte';
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


    // Local drag state (UI only, no API calls)
    let draggingId = $state<number | null>(null);
    let dragOverId = $state<number | null>(null);

    function handleAddLanguage() {
        if (newLanguageName.trim().length === 0) {
            return;
        }
        onAddLanguage({
            language_name: newLanguageName
        });
        newLanguageName = '';
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
                <FieldsWrap top>
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

                <ChildItemListEditor
                    items={frameworks[d.id] ?? []}
                    field="framework_name"
                    listTitle="Frameworks"
                    itemLabel="Framework"
                    inputLabel="Framework"
                    inputTitle="Framework/library name."
                    addLabel="Add framework"
                    addTitle="Add a framework/library for this language (e.g. Svelte, Rocket)."
                    emptyText="No frameworks."
                    dragLabel="Reorder framework"
                    {saving}
                    onadd={(text) => onAddFramework(d.id, { framework_name: text })}
                    onupdate={(id, value) => onUpdateFramework(id, { framework_name: value })}
                    onremove={onRemoveFramework}
                    onreorder={(fromId, toId) => onReorderFrameworks(d.id, fromId, toId)}
                    onvalidate={onValidateFramework}
                />
            </CollapsibleCard>
        {/each}
    </SectionMessage>
</SectionShell>
