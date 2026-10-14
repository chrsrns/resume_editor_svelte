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
    import TextArea from '$lib/components/ui/TextArea.svelte';
    import TextInput from '$lib/components/ui/TextInput.svelte';
    import Plus from '@lucide/svelte/icons/plus';
    import Trash2 from '@lucide/svelte/icons/trash-2';
    import ActiveStatus from '../ui/ActiveStatus.svelte';
    import ActiveToggle from '../ui/ActiveToggle.svelte';
    import type { ProjectDraft } from '$lib/stores/draft/portfolio.svelte';
    import { FIELD_LIMITS } from '$lib/limits';

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
    let newVideoUrl = $state('');
    let newProjectLink = $state('');
    let newSourceLink = $state('');
    let newDescription = $state('');

    // UI state for collapsed cards
    let collapsedById = $state<Record<number, boolean>>({});



    // Local drag state (UI only, no API calls)
    let draggingId = $state<number | null>(null);
    let dragOverId = $state<number | null>(null);

    function handleAddProject() {
        if (newName.trim().length === 0) {
            return;
        }
        onAddProject({
            project_name: newName,
            image_url: newImage,
            video_url: newVideoUrl,
            project_link: newProjectLink,
            source_code_link: newSourceLink,
            description: newDescription,
            active: true
        });
        newName = '';
        newImage = '';
        newVideoUrl = '';
        newProjectLink = '';
        newSourceLink = '';
        newDescription = '';
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
                label="Video URL"
                bind:value={newVideoUrl}
                maxlength={FIELD_LIMITS.video_url}
                title="Optional. Link to a project video."
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
                <FieldsWrap top>
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
                        label="Video URL"
                        bind:value={d.video_url}
                        maxlength={FIELD_LIMITS.video_url}
                        title="Optional. Link to a project video."
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
                        title="Hide this entry from non-owners"
                        onchange={(active) => onUpdateProject(d.id, { active })}
                    />
                    <Button variant="danger" onclick={() => onRemoveProject(d.id)}>
                        {#snippet icon()}<Trash2 size={16} />{/snippet}
                        Delete
                    </Button>
                </CardActions>

                <ChildItemListEditor
                    items={keyPoints[d.id] ?? []}
                    field="key_point"
                    listTitle="Key points"
                    itemLabel="Portfolio key point"
                    inputLabel="Key point"
                    inputTitle="Key point text."
                    addLabel="Add key point"
                    addTitle="Add a bullet point about this project."
                    emptyText="No key points."
                    dragLabel="Reorder portfolio key point"
                    {saving}
                    onadd={(text) => onAddKeyPoint(d.id, { key_point: text })}
                    onupdate={(id, value) => onUpdateKeyPoint(id, { key_point: value })}
                    onremove={onRemoveKeyPoint}
                    onreorder={(fromId, toId) => onReorderKeyPoints(d.id, fromId, toId)}
                    onvalidate={onValidateKeyPoint}
                />

                <ChildItemListEditor
                    items={technologies[d.id] ?? []}
                    field="technology_name"
                    listTitle="Technologies"
                    itemLabel="Portfolio technology"
                    inputLabel="Technology"
                    inputTitle="Technology name."
                    addLabel="Add technology"
                    addTitle="Add a technology used (e.g. Rust, Svelte, PostgreSQL)."
                    emptyText="No technologies."
                    dragLabel="Reorder portfolio technology"
                    {saving}
                    onadd={(text) => onAddTechnology(d.id, { technology_name: text })}
                    onupdate={(id, value) => onUpdateTechnology(id, { technology_name: value })}
                    onremove={onRemoveTechnology}
                    onreorder={(fromId, toId) => onReorderTechnologies(d.id, fromId, toId)}
                    onvalidate={onValidateTechnology}
                />
            </CollapsibleCard>
        {/each}
    </SectionMessage>
</SectionShell>
