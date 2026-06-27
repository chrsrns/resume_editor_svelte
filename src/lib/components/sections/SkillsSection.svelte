<script lang="ts">
    import type { DraftItem } from '$lib/stores/draft';
    import SectionShell from '$lib/components/sections/SectionShell.svelte';
    import Card from '$lib/components/sections/shared/Card.svelte';
    import DragHandle from '$lib/components/sections/shared/DragHandle.svelte';
    import FieldsWrap from '$lib/components/sections/shared/FieldsWrap.svelte';
    import NestedList from '$lib/components/sections/shared/NestedList.svelte';
    import SectionMessage from '$lib/components/sections/shared/SectionMessage.svelte';
    import Button from '$lib/components/ui/Button.svelte';
    import TextInput from '$lib/components/ui/TextInput.svelte';
    import Plus from '@lucide/svelte/icons/plus';
    import Trash2 from '@lucide/svelte/icons/trash-2';

    type SkillDraft = {
        id: number;
        skill_name: string;
        confidence_percentage: string;
        display_order: string;
    };

    let {
        drafts,
        onAdd,
        onUpdate,
        onDelete,
        onReorder,
        onValidate,
        saving
    }: {
        drafts: DraftItem<SkillDraft>[];
        onAdd: (draft: Omit<SkillDraft, 'id' | 'display_order'>) => void;
        onUpdate: (id: number, partial: Partial<SkillDraft>) => void;
        onDelete: (id: number) => void;
        onReorder: (fromId: number, toId: number) => void;
        onValidate: (id: number) => void;
        saving: boolean;
    } = $props();

    // UI state for the new skill form
    let newSkillName = $state('');
    let newConfidence = $state('80');

    // Local drag state (UI only, no API calls)
    let draggingId = $state<number | null>(null);
    let dragOverId = $state<number | null>(null);

    function handleAdd() {
        if (newSkillName.trim().length === 0) return;
        onAdd({
            skill_name: newSkillName,
            confidence_percentage: newConfidence
        });
        newSkillName = '';
        newConfidence = '80';
    }

    function handleKeyDown(e: KeyboardEvent) {
        if (e.key === 'Enter' && newSkillName.trim().length > 0) {
            handleAdd();
        }
    }

    function handleDragStart(id: number, e: DragEvent) {
        draggingId = id;
        dragOverId = null;
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', String(id));
        }
        console.log('Drag start', id);
    }

    function handleDragEnd() {
        console.log('Drag end', draggingId);
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
        console.log('Drop', { fromId, toId: id });
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

<SectionShell title="Skills" description="Editable list of skills for this resume.">
    <Card variant="new">
        <FieldsWrap>
            <TextInput
                label="Skill name"
                value={newSkillName}
                oninput={(e) => (newSkillName = (e.currentTarget as HTMLInputElement).value)}
                title="Name of the skill (e.g. Rust, SQL, Communication)."
                onkeydown={handleKeyDown}
            />
            <TextInput
                label="Confidence"
                small
                type="number"
                min={0}
                max={100}
                step={1}
                value={newConfidence}
                oninput={(e) => (newConfidence = (e.currentTarget as HTMLInputElement).value)}
                title="Confidence level (0–100)."
                onkeydown={handleKeyDown}
            />
            <Button onclick={handleAdd} disabled={saving || newSkillName.trim().length === 0}>
                {#snippet icon()}<Plus size={16} />{/snippet}
                Add
            </Button>
        </FieldsWrap>
    </Card>

    <SectionMessage error={null} loading={false} empty={false}>
        <NestedList
            title="Skills"
            loading={false}
            empty={drafts.filter((d: (typeof drafts)[0]) => d._status !== 'deleted').length === 0}
            emptyText="No skills yet."
        >
            {#each drafts.filter((d: (typeof drafts)[0]) => d._status !== 'deleted') as d (d.id)}
                <FieldsWrap
                    role="group"
                    aria-label="Skill"
                    class={draggingId != null && dragOverId === d.id && draggingId !== d.id
                        ? 'dropOver'
                        : ''}
                    ondragover={(e) => handleDragOver(d.id, e)}
                    ondrop={(e) => handleDrop(d.id, e)}
                >
                    <DragHandle
                        ondragstart={(e) => handleDragStart(d.id, e)}
                        ondragend={handleDragEnd}
                        onkeydown={(e) => handleHandleKeydown(d.id, e)}
                        disabled={saving}
                        dragging={draggingId === d.id}
                        label="Reorder skill"
                    />
                    <TextInput
                        label="Skill name"
                        value={d.skill_name}
                        oninput={(e) =>
                            onUpdate(d.id, {
                                skill_name: (e.currentTarget as HTMLInputElement).value
                            })}
                        onblur={() => onValidate(d.id)}
                        title="Skill name."
                    />
                    <TextInput
                        label="Confidence"
                        small
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={d.confidence_percentage}
                        oninput={(e) =>
                            onUpdate(d.id, {
                                confidence_percentage: (e.currentTarget as HTMLInputElement).value
                            })}
                        onblur={() => onValidate(d.id)}
                        title="Confidence level (0–100)."
                    />
                    <Button variant="danger" onclick={() => onDelete(d.id)} disabled={saving}>
                        {#snippet icon()}<Trash2 size={16} />{/snippet}
                        Delete
                    </Button>
                    {#if d._validationError}
                        <p class="error-message">{d._validationError}</p>
                    {/if}
                </FieldsWrap>
            {/each}
        </NestedList>
    </SectionMessage>
</SectionShell>

<style>
    .error-message {
        margin: 0;
        font-size: 13px;
        color: var(--color-error);
    }
</style>
