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
    import Plus from '@lucide/svelte/icons/plus';
    import Trash2 from '@lucide/svelte/icons/trash-2';
    import ActiveStatus from '../ui/ActiveStatus.svelte';
    import ActiveToggle from '../ui/ActiveToggle.svelte';

    type ProjectDraft = {
        id: number;
        project_name: string;
        image_url: string;
        project_link: string;
        source_code_link: string;
        description: string;
        display_order: string;
        active: boolean;
    };

    type KeyPointDraft = {
        id: number;
        key_point: string;
        display_order: string;
    };

    type TechnologyDraft = {
        id: number;
        technology_name: string;
        display_order: string;
    };

    let {
        drafts,
        keyPoints,
        technologies,
        onAddProject,
        onUpdateProject,
        onRemoveProject,
        onAddKeyPoint,
        onUpdateKeyPoint,
        onRemoveKeyPoint,
        onAddTechnology,
        onUpdateTechnology,
        onRemoveTechnology,
        onReorder,
        onReorderKeyPoints,
        onReorderTechnologies,
        onValidateProject,
        onValidateKeyPoint,
        onValidateTechnology,
        saving
    }: {
        drafts: DraftItem<ProjectDraft>[];
        keyPoints: Record<number, DraftItem<KeyPointDraft>[]>;
        technologies: Record<number, DraftItem<TechnologyDraft>[]>;
        onAddProject: (draft: Omit<ProjectDraft, 'id' | 'display_order'>) => void;
        onUpdateProject: (id: number, partial: Partial<ProjectDraft>) => void;
        onRemoveProject: (id: number) => void;
        onAddKeyPoint: (
            projectId: number,
            draft: Omit<KeyPointDraft, 'id' | 'display_order'>
        ) => void;
        onUpdateKeyPoint: (id: number, partial: Partial<KeyPointDraft>) => void;
        onRemoveKeyPoint: (id: number) => void;
        onAddTechnology: (
            projectId: number,
            draft: Omit<TechnologyDraft, 'id' | 'display_order'>
        ) => void;
        onUpdateTechnology: (id: number, partial: Partial<TechnologyDraft>) => void;
        onRemoveTechnology: (id: number) => void;
        onReorder: (fromId: number, toId: number) => void;
        onReorderKeyPoints: (projectId: number, fromId: number, toId: number) => void;
        onReorderTechnologies: (projectId: number, fromId: number, toId: number) => void;
        onValidateProject: (id: number) => void;
        onValidateKeyPoint: (id: number) => void;
        onValidateTechnology: (id: number) => void;
        saving: boolean;
    } = $props();

    // UI state for the new project form
    let newName = $state('');
    let newImage = $state('');
    let newProjectLink = $state('');
    let newSourceLink = $state('');
    let newDescription = $state('');

    // UI state for collapsed cards
    let collapsedById = $state<Record<number, boolean>>({});

    // UI state for new key point text
    let newKeyPointText = $state<Record<number, string>>({});

    // UI state for new technology text
    let newTechText = $state<Record<number, string>>({});

    // Local drag state (UI only, no API calls)
    let draggingId = $state<number | null>(null);
    let dragOverId = $state<number | null>(null);
    let keyPointDragging = $state<{ group: number; id: number } | null>(null);
    let keyPointDragOver = $state<{ group: number; id: number } | null>(null);
    let techDragging = $state<{ group: number; id: number } | null>(null);
    let techDragOver = $state<{ group: number; id: number } | null>(null);

    function handleAddProject() {
        if (newName.trim().length === 0) {
            return;
        }
        onAddProject({
            project_name: newName,
            image_url: newImage,
            project_link: newProjectLink,
            source_code_link: newSourceLink,
            description: newDescription,
            active: true
        });
        newName = '';
        newImage = '';
        newProjectLink = '';
        newSourceLink = '';
        newDescription = '';
    }

    function handleAddKeyPoint(projectId: number) {
        const text = (newKeyPointText[projectId] ?? '').trim();
        if (text.length === 0) return;
        onAddKeyPoint(projectId, { key_point: text });
        newKeyPointText = { ...newKeyPointText, [projectId]: '' };
    }

    function handleAddTechnology(projectId: number) {
        const text = (newTechText[projectId] ?? '').trim();
        if (text.length === 0) return;
        onAddTechnology(projectId, { technology_name: text });
        newTechText = { ...newTechText, [projectId]: '' };
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

    function handleKeyPointDragStart(projectId: number, id: number, e: DragEvent) {
        keyPointDragging = { group: projectId, id };
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

    function handleKeyPointDragOver(projectId: number, id: number, e: DragEvent) {
        if (keyPointDragging == null) return;
        e.preventDefault();
        e.stopPropagation();
        keyPointDragOver = { group: projectId, id };
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    }

    function handleKeyPointDrop(projectId: number, id: number, e: DragEvent) {
        e.preventDefault();
        e.stopPropagation();
        const fromItem = keyPointDragging;
        handleKeyPointDragEnd();
        if (fromItem == null || fromItem.id === id) return;
        onReorderKeyPoints(projectId, fromItem.id, id);
    }

    function handleKeyPointHandleKeydown(projectId: number, id: number, e: KeyboardEvent) {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
        e.preventDefault();

        const visibleKeyPoints = (keyPoints[projectId] ?? []).filter(
            (kp: (typeof keyPoints)[number][number]) => kp._status !== 'deleted'
        );
        const ids = visibleKeyPoints.map((kp: (typeof visibleKeyPoints)[0]) => kp.id);
        const index = ids.indexOf(id);
        if (index === -1) return;
        const nextIndex = e.key === 'ArrowUp' ? index - 1 : index + 1;
        if (nextIndex < 0 || nextIndex >= ids.length) return;
        onReorderKeyPoints(projectId, id, ids[nextIndex]);
    }

    function handleTechDragStart(projectId: number, id: number, e: DragEvent) {
        techDragging = { group: projectId, id };
        techDragOver = null;
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', String(id));
        }
    }

    function handleTechDragEnd() {
        techDragging = null;
        techDragOver = null;
    }

    function handleTechDragOver(projectId: number, id: number, e: DragEvent) {
        if (techDragging == null) return;
        e.preventDefault();
        e.stopPropagation();
        techDragOver = { group: projectId, id };
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    }

    function handleTechDrop(projectId: number, id: number, e: DragEvent) {
        e.preventDefault();
        e.stopPropagation();
        const fromItem = techDragging;
        handleTechDragEnd();
        if (fromItem == null || fromItem.id === id) return;
        onReorderTechnologies(projectId, fromItem.id, id);
    }

    function handleTechHandleKeydown(projectId: number, id: number, e: KeyboardEvent) {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
        e.preventDefault();

        const visibleTechs = (technologies[projectId] ?? []).filter(
            (t: (typeof technologies)[number][number]) => t._status !== 'deleted'
        );
        const ids = visibleTechs.map((t: (typeof visibleTechs)[0]) => t.id);
        const index = ids.indexOf(id);
        if (index === -1) return;
        const nextIndex = e.key === 'ArrowUp' ? index - 1 : index + 1;
        if (nextIndex < 0 || nextIndex >= ids.length) return;
        onReorderTechnologies(projectId, id, ids[nextIndex]);
    }
</script>

<SectionShell title="Portfolio" description="Projects with key points and technologies.">
    <Card variant="new">
        <FieldsWrap>
            <TextInput label="Project name" bind:value={newName} title="Project name/title." />
            <TextInput
                label="Image URL"
                bind:value={newImage}
                title="Optional. Link to a preview image for the project."
            />
            <TextInput
                label="Project link"
                bind:value={newProjectLink}
                title="Optional. Link to the live project/demo."
            />
            <TextInput
                label="Source code link"
                bind:value={newSourceLink}
                title="Optional. Link to the source repository (e.g. GitHub)."
            />
        </FieldsWrap>
        <TextArea
            label="Description"
            bind:value={newDescription}
            rows={2}
            title="Optional. Short summary of what you built and the impact."
        />
        <CardActions>
            <Button onclick={handleAddProject} disabled={saving || newName.trim().length === 0}>
                {#snippet icon()}<Plus size={16} />{/snippet}
                {saving ? 'Adding…' : 'Add project'}
            </Button>
        </CardActions>
    </Card>

    <SectionMessage
        empty={drafts.filter((d) => d._status !== 'deleted').length === 0}
        emptyText="No portfolio projects yet."
    >
        {#each drafts.filter((d) => d._status !== 'deleted') as d (d.id)}
            <CollapsibleCard
                ariaLabel="Portfolio project"
                collapsed={collapsedById[d.id] ?? true}
                oncollapsedchange={(next) => (collapsedById = { ...collapsedById, [d.id]: next })}
                draggable
                dragDisabled={saving}
                dragging={draggingId === d.id}
                dragLabel="Reorder portfolio project"
                ondragstart={(e) => handleDragStart(d.id, e)}
                ondragend={() => handleDragEnd()}
                onkeydown={(e) => handleHandleKeydown(d.id, e)}
                dropOver={draggingId != null && dragOverId === d.id && draggingId !== d.id}
                ondragover={(e) => handleDragOver(d.id, e)}
                ondrop={(e) => handleDrop(d.id, e)}
            >
                {#snippet titleHeader()}
                    <div style="display: flex; flex-direction: row; gap: 1em; align-items: center;">
                        <ActiveStatus style="width: 4em" active={d.active} size="sm" />
                        <div>{d.project_name.trim()}</div>
                    </div>
                {/snippet}
                <FieldsWrap style="padding-top: 6px;">
                    <TextInput
                        label="Project name"
                        bind:value={d.project_name}
                        title="Project name/title."
                        onblur={() => onValidateProject(d.id)}
                    />
                    <TextInput
                        label="Image URL"
                        bind:value={d.image_url}
                        title="Optional. Preview image URL."
                        onblur={() => onValidateProject(d.id)}
                    />
                    <TextInput
                        label="Project link"
                        bind:value={d.project_link}
                        title="Optional. Live project/demo link."
                        onblur={() => onValidateProject(d.id)}
                    />
                    <TextInput
                        label="Source code link"
                        bind:value={d.source_code_link}
                        title="Optional. Source code repository link."
                        onblur={() => onValidateProject(d.id)}
                    />
                </FieldsWrap>
                <TextArea
                    label="Description"
                    bind:value={d.description}
                    rows={2}
                    title="Optional. Description/details."
                    onblur={() => onValidateProject(d.id)}
                />
                <CardActions>
                    <ActiveToggle
                        active={d.active}
                        size="sm"
                        title="Hide this entry from non-owners"
                        onchange={(active) => onUpdateProject(d.id, { active })}
                    />
                    <Button variant="danger" onclick={() => onRemoveProject(d.id)}>
                        {#snippet icon()}<Trash2 size={16} />{/snippet}
                        Delete
                    </Button>
                </CardActions>

                <NestedList
                    title="Key points"
                    loading={false}
                    empty={(keyPoints[d.id] ?? []).filter((kp) => kp._status !== 'deleted')
                        .length === 0}
                    emptyText="No key points."
                >
                    {#each (keyPoints[d.id] ?? []).filter((kp) => kp._status !== 'deleted') as kp (kp.id)}
                        <FieldsWrap
                            role="group"
                            aria-label="Portfolio key point"
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
                                ondragend={() => handleKeyPointDragEnd()}
                                onkeydown={(e) => handleKeyPointHandleKeydown(d.id, kp.id, e)}
                                disabled={saving}
                                dragging={keyPointDragging != null &&
                                    keyPointDragging.group === d.id &&
                                    keyPointDragging.id === kp.id}
                                label="Reorder portfolio key point"
                            />
                            <TextInput
                                label="Key point"
                                bind:value={kp.key_point}
                                title="Key point text."
                                onblur={() => onValidateKeyPoint(kp.id)}
                            />
                            <Button variant="danger" onclick={() => onRemoveKeyPoint(kp.id)}>
                                {#snippet icon()}<Trash2 size={16} />{/snippet}
                                Delete
                            </Button>
                        </FieldsWrap>
                    {/each}
                </NestedList>

                <FieldsWrap>
                    <TextInput
                        label="Add key point"
                        title="Add a bullet point about this project."
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

                <NestedList
                    title="Technologies"
                    loading={false}
                    empty={(technologies[d.id] ?? []).filter((t) => t._status !== 'deleted')
                        .length === 0}
                    emptyText="No technologies."
                >
                    {#each (technologies[d.id] ?? []).filter((t) => t._status !== 'deleted') as t (t.id)}
                        <FieldsWrap
                            role="group"
                            aria-label="Portfolio technology"
                            class={techDragging != null &&
                            techDragOver != null &&
                            techDragOver.group === d.id &&
                            techDragOver.id === t.id &&
                            !(techDragging.group === d.id && techDragging.id === t.id)
                                ? 'dropOver'
                                : ''}
                            ondragover={(e) => handleTechDragOver(d.id, t.id, e)}
                            ondrop={(e) => handleTechDrop(d.id, t.id, e)}
                        >
                            <DragHandle
                                ondragstart={(e) => handleTechDragStart(d.id, t.id, e)}
                                ondragend={() => handleTechDragEnd()}
                                onkeydown={(e) => handleTechHandleKeydown(d.id, t.id, e)}
                                disabled={saving}
                                dragging={techDragging != null &&
                                    techDragging.group === d.id &&
                                    techDragging.id === t.id}
                                label="Reorder portfolio technology"
                            />
                            <TextInput
                                label="Technology"
                                bind:value={t.technology_name}
                                title="Technology name."
                                onblur={() => onValidateTechnology(t.id)}
                            />
                            <Button variant="danger" onclick={() => onRemoveTechnology(t.id)}>
                                {#snippet icon()}<Trash2 size={16} />{/snippet}
                                Delete
                            </Button>
                        </FieldsWrap>
                    {/each}
                </NestedList>

                <FieldsWrap>
                    <TextInput
                        label="Add technology"
                        title="Add a technology used (e.g. Rust, Svelte, PostgreSQL)."
                        value={newTechText[d.id] ?? ''}
                        oninput={(e) =>
                            (newTechText = {
                                ...newTechText,
                                [d.id]: (e.target as HTMLInputElement).value
                            })}
                        onkeydown={(e) => {
                            if (e.key === 'Enter' && (newTechText[d.id] ?? '').trim().length > 0) {
                                handleAddTechnology(d.id);
                            }
                        }}
                    />
                    <Button
                        onclick={() => handleAddTechnology(d.id)}
                        disabled={saving || (newTechText[d.id] ?? '').trim().length === 0}
                    >
                        {#snippet icon()}<Plus size={16} />{/snippet}
                        Add
                    </Button>
                </FieldsWrap>
            </CollapsibleCard>
        {/each}
    </SectionMessage>
</SectionShell>
