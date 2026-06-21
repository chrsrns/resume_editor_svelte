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
    import TextArea from '$lib/components/ui/TextArea.svelte';
    import TextInput from '$lib/components/ui/TextInput.svelte';
    import ActiveStatus from '../ui/ActiveStatus.svelte';
    import Plus from '@lucide/svelte/icons/plus';
    import Trash2 from '@lucide/svelte/icons/trash-2';

    type EducationDraft = {
        id: number;
        education_stage: string;
        institution_name: string;
        degree: string;
        start_date: string;
        end_date: string;
        description: string;
        display_order: string;
    };

    type KeyPointDraft = {
        id: number;
        key_point: string;
        display_order: string;
    };

    let {
        drafts,
        keyPoints,
        onAddEducation,
        onUpdateEducation,
        onRemoveEducation,
        onReorder,
        onAddKeyPoint,
        onUpdateKeyPoint,
        onRemoveKeyPoint,
        onReorderKeyPoints,
        onValidateEducation,
        onValidateKeyPoint,
        saving
    }: {
        drafts: DraftItem<EducationDraft>[];
        keyPoints: Record<number, DraftItem<KeyPointDraft>[]>;
        onAddEducation: (draft: Omit<EducationDraft, 'id' | 'display_order'>) => void;
        onUpdateEducation: (id: number, partial: Partial<EducationDraft>) => void;
        onRemoveEducation: (id: number) => void;
        onReorder: (fromId: number, toId: number) => void;
        onAddKeyPoint: (
            educationId: number,
            draft: Omit<KeyPointDraft, 'id' | 'display_order'>
        ) => void;
        onUpdateKeyPoint: (id: number, partial: Partial<KeyPointDraft>) => void;
        onRemoveKeyPoint: (id: number) => void;
        onReorderKeyPoints: (educationId: number, fromId: number, toId: number) => void;
        onValidateEducation: (id: number) => void;
        onValidateKeyPoint: (id: number) => void;
        saving: boolean;
    } = $props();

    // UI state for the new education form
    let newStage = $state('');
    let newInstitution = $state('');
    let newDegree = $state('');
    let newStart = $state('');
    let newEnd = $state('');
    let newDescription = $state('');

    // UI state for collapsed cards
    let collapsedById = $state<Record<number, boolean>>({});

    // UI state for new key point text
    let newKeyPointText = $state<Record<number, string>>({});

    // Local drag state (UI only, no API calls)
    let draggingId = $state<number | null>(null);
    let dragOverId = $state<number | null>(null);
    let keyPointDragging = $state<{ group: number; id: number } | null>(null);
    let keyPointDragOver = $state<{ group: number; id: number } | null>(null);

    function handleAddEducation() {
        if (
            newStage.trim().length === 0 ||
            newInstitution.trim().length === 0 ||
            newStart.trim().length === 0
        ) {
            return;
        }
        onAddEducation({
            education_stage: newStage,
            institution_name: newInstitution,
            degree: newDegree,
            start_date: newStart,
            end_date: newEnd,
            description: newDescription
        });
        newStage = '';
        newInstitution = '';
        newDegree = '';
        newStart = '';
        newEnd = '';
        newDescription = '';
    }

    function handleAddKeyPoint(educationId: number) {
        const text = (newKeyPointText[educationId] ?? '').trim();
        if (text.length === 0) return;
        onAddKeyPoint(educationId, { key_point: text });
        newKeyPointText = { ...newKeyPointText, [educationId]: '' };
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

    function handleKeyPointDragStart(educationId: number, id: number, e: DragEvent) {
        keyPointDragging = { group: educationId, id };
        keyPointDragOver = null;
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', String(id));
        }
    }

    function handleKeyPointDragEnd() {
        keyPointDragging = null;
        keyPointDragOver = null;
    }

    function handleKeyPointDragOver(educationId: number, id: number, e: DragEvent) {
        if (keyPointDragging == null) return;
        e.preventDefault();
        e.stopPropagation();
        keyPointDragOver = { group: educationId, id };
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    }

    function handleKeyPointDrop(educationId: number, id: number, e: DragEvent) {
        e.preventDefault();
        e.stopPropagation();
        const fromItem = keyPointDragging;
        handleKeyPointDragEnd();
        if (fromItem == null || fromItem.id === id) return;
        onReorderKeyPoints(educationId, fromItem.id, id);
    }

    function handleKeyPointHandleKeydown(educationId: number, id: number, e: KeyboardEvent) {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
        e.preventDefault();

        const visibleKeyPoints = (keyPoints[educationId] ?? []).filter(
            (kp: (typeof keyPoints)[number][number]) => kp._status !== 'deleted'
        );
        const ids = visibleKeyPoints.map((kp: (typeof visibleKeyPoints)[0]) => kp.id);
        const index = ids.indexOf(id);
        if (index === -1) return;
        const nextIndex = e.key === 'ArrowUp' ? index - 1 : index + 1;
        if (nextIndex < 0 || nextIndex >= ids.length) return;
        onReorderKeyPoints(educationId, id, ids[nextIndex]);
    }
</script>

<SectionShell title="Education" description="Education entries and key points.">
    <Card variant="new">
        <FieldsWrap>
            <TextInput
                label="Stage (e.g. Bachelor)"
                bind:value={newStage}
                title="Education stage/level (e.g. High School, Diploma, Bachelor, Master)."
            />
            <TextInput
                label="Institution"
                bind:value={newInstitution}
                title="School/university/training provider name."
            />
            <TextInput
                label="Degree"
                bind:value={newDegree}
                title="Optional. Degree/qualification name."
            />
            <TextInput
                label="Start date"
                type="date"
                bind:value={newStart}
                title="Start date for this education."
            />
            <TextInput
                label="End date"
                type="date"
                bind:value={newEnd}
                title="Optional. End date (leave blank if ongoing)."
            />
        </FieldsWrap>
        <TextArea
            label="Description"
            bind:value={newDescription}
            rows={2}
            title="Optional. Additional details about the education."
        />
        <CardActions>
            <Button
                onclick={handleAddEducation}
                disabled={saving ||
                    newStage.trim().length === 0 ||
                    newInstitution.trim().length === 0 ||
                    newStart.trim().length === 0}
            >
                {#snippet icon()}<Plus size={16} />{/snippet}
                Add education
            </Button>
        </CardActions>
    </Card>

    <SectionMessage error={null} loading={false} empty={false}>
        {#each drafts.filter((d: (typeof drafts)[0]) => d._status !== 'deleted') as d (d.id)}
            <CollapsibleCard
                ariaLabel="Education entry"
                collapsed={collapsedById[d.id] ?? true}
                oncollapsedchange={(next) => (collapsedById = { ...collapsedById, [d.id]: next })}
                draggable
                dragDisabled={saving}
                dragging={draggingId === d.id}
                dragLabel="Reorder education entry"
                ondragstart={(e) => handleDragStart(d.id, e)}
                ondragend={handleDragEnd}
                onkeydown={(e) => handleHandleKeydown(d.id, e)}
                dropOver={draggingId != null && dragOverId === d.id && draggingId !== d.id}
                ondragover={(e) => handleDragOver(d.id, e)}
                ondrop={(e) => handleDrop(d.id, e)}
            >
                {#snippet titleHeader()}
                    <div style="display: flex; flex-direction: row; gap: 1em">
                        <ActiveStatus style="width: 4em" active={true} size="sm" />
                        <div>
                            {[d.education_stage, d.institution_name]
                                .map((x) => x.trim())
                                .filter(Boolean)
                                .join(' — ')}
                        </div>
                    </div>
                {/snippet}
                <FieldsWrap style="padding-top: 6px;">
                    <TextInput
                        label="Stage"
                        value={d.education_stage}
                        oninput={(e) =>
                            onUpdateEducation(d.id, {
                                education_stage: (e.currentTarget as HTMLInputElement).value
                            })}
                        onblur={() => onValidateEducation(d.id)}
                        title="Education stage/level."
                    />
                    <TextInput
                        label="Institution"
                        value={d.institution_name}
                        oninput={(e) =>
                            onUpdateEducation(d.id, {
                                institution_name: (e.currentTarget as HTMLInputElement).value
                            })}
                        onblur={() => onValidateEducation(d.id)}
                        title="Institution name."
                    />
                    <TextInput
                        label="Degree"
                        value={d.degree}
                        oninput={(e) =>
                            onUpdateEducation(d.id, {
                                degree: (e.currentTarget as HTMLInputElement).value
                            })}
                        onblur={() => onValidateEducation(d.id)}
                        title="Optional. Degree/qualification name."
                    />
                    <TextInput
                        label="Start date"
                        type="date"
                        value={d.start_date}
                        oninput={(e) =>
                            onUpdateEducation(d.id, {
                                start_date: (e.currentTarget as HTMLInputElement).value
                            })}
                        onblur={() => onValidateEducation(d.id)}
                        title="Start date."
                    />
                    <TextInput
                        label="End date"
                        type="date"
                        value={d.end_date}
                        oninput={(e) =>
                            onUpdateEducation(d.id, {
                                end_date: (e.currentTarget as HTMLInputElement).value
                            })}
                        onblur={() => onValidateEducation(d.id)}
                        title="Optional. End date."
                    />
                </FieldsWrap>
                <TextArea
                    label="Description"
                    value={d.description}
                    oninput={(e) =>
                        onUpdateEducation(d.id, {
                            description: (e.currentTarget as HTMLInputElement).value
                        })}
                    rows={2}
                    title="Optional. Description/details."
                />
                <CardActions>
                    <Button
                        variant="danger"
                        onclick={() => onRemoveEducation(d.id)}
                        disabled={saving}
                    >
                        {#snippet icon()}<Trash2 size={16} />{/snippet}
                        Delete
                    </Button>
                </CardActions>

                <NestedList
                    title="Key points"
                    loading={false}
                    empty={(keyPoints[d.id] ?? []).filter(
                        (kp: (typeof keyPoints)[number][number]) => kp._status !== 'deleted'
                    ).length === 0}
                    emptyText="No key points."
                >
                    {#each (keyPoints[d.id] ?? []).filter((kp: (typeof keyPoints)[number][number]) => kp._status !== 'deleted') as kp (kp.id)}
                        <FieldsWrap
                            role="group"
                            aria-label="Education key point"
                            class={keyPointDragging != null &&
                            keyPointDragOver != null &&
                            keyPointDragOver.group === d.id &&
                            keyPointDragOver.id === kp.id &&
                            !(keyPointDragging.group === d.id && keyPointDragging.id === kp.id)
                                ? 'dropOver'
                                : ''}
                            ondragover={(e) => handleKeyPointDragOver(d.id, kp.id, e)}
                            ondrop={(e) => handleKeyPointDrop(d.id, kp.id, e)}
                        >
                            <DragHandle
                                ondragstart={(e) => handleKeyPointDragStart(d.id, kp.id, e)}
                                ondragend={handleKeyPointDragEnd}
                                onkeydown={(e) => handleKeyPointHandleKeydown(d.id, kp.id, e)}
                                disabled={saving}
                                dragging={keyPointDragging != null &&
                                    keyPointDragging.group === d.id &&
                                    keyPointDragging.id === kp.id}
                                label="Reorder education key point"
                            />
                            <TextInput
                                label="Key point"
                                value={kp.key_point}
                                oninput={(e) =>
                                    onUpdateKeyPoint(kp.id, {
                                        key_point: (e.currentTarget as HTMLInputElement).value
                                    })}
                                onblur={() => onValidateKeyPoint(kp.id)}
                                title="Key point text."
                                onkeydown={(e) => {
                                    if (
                                        e.key === 'Enter' &&
                                        (kp.key_point ?? '').trim().length > 0
                                    ) {
                                        // No-op - saving is now global
                                    }
                                }}
                            />
                            <Button
                                variant="danger"
                                onclick={() => onRemoveKeyPoint(kp.id)}
                                disabled={saving}
                            >
                                {#snippet icon()}<Trash2 size={16} />{/snippet}
                                Delete
                            </Button>
                        </FieldsWrap>
                    {/each}
                </NestedList>

                <FieldsWrap>
                    <TextInput
                        label="Add key point"
                        title="Add a bullet point for this education entry."
                        value={newKeyPointText[d.id] ?? ''}
                        oninput={(e) =>
                            (newKeyPointText = {
                                ...newKeyPointText,
                                [d.id]: (e.target as HTMLInputElement).value
                            })}
                        onkeydown={(e) => {
                            if (
                                e.key === 'Enter' &&
                                (newKeyPointText[d.id] ?? '').trim().length > 0
                            ) {
                                handleAddKeyPoint(d.id);
                            }
                        }}
                    />
                    <Button
                        onclick={() => handleAddKeyPoint(d.id)}
                        disabled={saving || (newKeyPointText[d.id] ?? '').trim().length === 0}
                    >
                        {#snippet icon()}<Plus size={16} />{/snippet}
                        Add
                    </Button>
                </FieldsWrap>
            </CollapsibleCard>
        {/each}
    </SectionMessage>
</SectionShell>
