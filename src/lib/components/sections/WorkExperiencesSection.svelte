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

    type WorkDraft = {
        id: number;
        job_title: string;
        company_name: string;
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
        onAddWork,
        onUpdateWork,
        onRemoveWork,
        onReorder,
        onToggleActive,
        onAddKeyPoint,
        onUpdateKeyPoint,
        onRemoveKeyPoint,
        onReorderKeyPoints,
        onValidateWork,
        onValidateKeyPoint,
        saving
    }: {
        drafts: DraftItem<WorkDraft>[];
        keyPoints: Record<number, DraftItem<KeyPointDraft>[]>;
        onAddWork: (draft: Omit<WorkDraft, 'id' | 'display_order'>) => void;
        onUpdateWork: (id: number, partial: Partial<WorkDraft>) => void;
        onRemoveWork: (id: number) => void;
        onReorder: (fromId: number, toId: number) => void;
        onToggleActive: (id: number) => void;
        onAddKeyPoint: (workId: number, draft: Omit<KeyPointDraft, 'id' | 'display_order'>) => void;
        onUpdateKeyPoint: (id: number, partial: Partial<KeyPointDraft>) => void;
        onRemoveKeyPoint: (id: number) => void;
        onReorderKeyPoints: (workId: number, fromId: number, toId: number) => void;
        onValidateWork: (id: number) => void;
        onValidateKeyPoint: (id: number) => void;
        saving: boolean;
    } = $props();

    // UI state for the new work form
    let newTitle = $state('');
    let newCompany = $state('');
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

    function handleAddWork() {
        if (newTitle.trim().length === 0 || newStart.trim().length === 0) {
            return;
        }
        onAddWork({
            job_title: newTitle,
            company_name: newCompany,
            start_date: newStart,
            end_date: newEnd,
            description: newDescription
        });
        newTitle = '';
        newCompany = '';
        newStart = '';
        newEnd = '';
        newDescription = '';
    }

    function handleAddKeyPoint(workId: number) {
        const text = (newKeyPointText[workId] ?? '').trim();
        if (text.length === 0) return;
        onAddKeyPoint(workId, { key_point: text });
        newKeyPointText = { ...newKeyPointText, [workId]: '' };
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

    function handleKeyPointDragStart(workId: number, id: number, e: DragEvent) {
        keyPointDragging = { group: workId, id };
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

    function handleKeyPointDragOver(workId: number, id: number, e: DragEvent) {
        if (keyPointDragging == null) return;
        e.preventDefault();
        e.stopPropagation();
        keyPointDragOver = { group: workId, id };
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    }

    function handleKeyPointDrop(workId: number, id: number, e: DragEvent) {
        e.preventDefault();
        e.stopPropagation();
        const fromItem = keyPointDragging;
        handleKeyPointDragEnd();
        if (fromItem == null || fromItem.id === id) return;
        onReorderKeyPoints(workId, fromItem.id, id);
    }

    function handleKeyPointHandleKeydown(workId: number, id: number, e: KeyboardEvent) {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
        e.preventDefault();

        const visibleKeyPoints = (keyPoints[workId] ?? []).filter(
            (kp: (typeof keyPoints)[number][number]) => kp._status !== 'deleted'
        );
        const ids = visibleKeyPoints.map((kp: (typeof visibleKeyPoints)[0]) => kp.id);
        const index = ids.indexOf(id);
        if (index === -1) return;
        const nextIndex = e.key === 'ArrowUp' ? index - 1 : index + 1;
        if (nextIndex < 0 || nextIndex >= ids.length) return;
        onReorderKeyPoints(workId, id, ids[nextIndex]);
    }
</script>

<SectionShell title="Work experience" description="Work experiences and key points.">
    <Card variant="new">
        <FieldsWrap>
            <TextInput
                label="Job title"
                bind:value={newTitle}
                title="Role/title (e.g. Software Engineer)."
            />
            <TextInput label="Company" bind:value={newCompany} title="Company/organization name." />
            <TextInput label="Start date" type="date" bind:value={newStart} title="Start date." />
            <TextInput
                label="End date"
                type="date"
                bind:value={newEnd}
                title="Optional. End date (leave blank if current)."
            />
        </FieldsWrap>
        <TextArea
            label="Description"
            bind:value={newDescription}
            rows={2}
            title="Optional. Summary of responsibilities/impact."
        />
        <CardActions>
            <Button
                onclick={handleAddWork}
                disabled={saving || newTitle.trim().length === 0 || newStart.trim().length === 0}
            >
                {#snippet icon()}<Plus size={16} />{/snippet}
                Add work experience
            </Button>
        </CardActions>
    </Card>

    <SectionMessage error={null} loading={false} empty={false}>
        {#each drafts.filter((d: (typeof drafts)[0]) => d._status !== 'deleted') as d (d.id)}
            <CollapsibleCard
                ariaLabel="Work experience"
                collapsed={collapsedById[d.id] ?? true}
                oncollapsedchange={(next) => (collapsedById = { ...collapsedById, [d.id]: next })}
                draggable
                dragDisabled={saving}
                dragging={draggingId === d.id}
                dragLabel="Reorder work experience"
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
                            {[d.job_title, d.company_name]
                                .map((x) => x.trim())
                                .filter(Boolean)
                                .join(' — ')}
                        </div>
                    </div>
                {/snippet}
                <FieldsWrap style="padding-top: 6px;">
                    <TextInput
                        label="Job title"
                        value={d.job_title}
                        oninput={(e) =>
                            onUpdateWork(d.id, {
                                job_title: (e.currentTarget as HTMLInputElement).value
                            })}
                        onblur={() => onValidateWork(d.id)}
                        title="Job title/role."
                    />
                    <TextInput
                        label="Company"
                        value={d.company_name}
                        oninput={(e) =>
                            onUpdateWork(d.id, {
                                company_name: (e.currentTarget as HTMLInputElement).value
                            })}
                        onblur={() => onValidateWork(d.id)}
                        title="Company/organization."
                    />
                    <TextInput
                        label="Start date"
                        type="date"
                        value={d.start_date}
                        oninput={(e) =>
                            onUpdateWork(d.id, {
                                start_date: (e.currentTarget as HTMLInputElement).value
                            })}
                        onblur={() => onValidateWork(d.id)}
                        title="Start date."
                    />
                    <TextInput
                        label="End date"
                        type="date"
                        value={d.end_date}
                        oninput={(e) =>
                            onUpdateWork(d.id, {
                                end_date: (e.currentTarget as HTMLInputElement).value
                            })}
                        onblur={() => onValidateWork(d.id)}
                        title="Optional. End date."
                    />
                </FieldsWrap>
                <TextArea
                    label="Description"
                    value={d.description}
                    oninput={(e) =>
                        onUpdateWork(d.id, {
                            description: (e.currentTarget as HTMLInputElement).value
                        })}
                    onblur={() => onValidateWork(d.id)}
                    rows={2}
                    title="Optional. Description/details."
                />
                <CardActions>
                    <Button
                        variant="secondary"
                        onclick={() => onToggleActive(d.id)}
                        title="Hide this entry from non-owners"
                        disabled={saving}
                    >
                        Deactivate
                    </Button>
                    <Button variant="danger" onclick={() => onRemoveWork(d.id)} disabled={saving}>
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
                            aria-label="Work experience key point"
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
                                label="Reorder work experience key point"
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
                        title="Add a bullet point for this work experience."
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
                        title="Add key point"
                    >
                        {#snippet icon()}<Plus size={16} />{/snippet}
                        Add
                    </Button>
                </FieldsWrap>
            </CollapsibleCard>
        {/each}
    </SectionMessage>
</SectionShell>
