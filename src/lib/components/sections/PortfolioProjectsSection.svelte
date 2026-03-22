<script lang="ts">
	import { onMount } from 'svelte';
	import SectionShell from '$lib/components/sections/SectionShell.svelte';
	import Card from '$lib/components/sections/shared/Card.svelte';
	import CardActions from '$lib/components/sections/shared/CardActions.svelte';
	import CollapsibleCard from '$lib/components/sections/shared/CollapsibleCard.svelte';
	import DragHandle from '$lib/components/sections/shared/DragHandle.svelte';
	import {
		byDisplayOrder,
		createGroupedDisplayOrderReorder,
		createGroupedDragReorder,
		createCardDragReorder,
		createDisplayOrderReorder
	} from '$lib/components/sections/shared/displayOrderReorder';
	import FieldsWrap from '$lib/components/sections/shared/FieldsWrap.svelte';
	import NestedList from '$lib/components/sections/shared/NestedList.svelte';
	import SectionMessage from '$lib/components/sections/shared/SectionMessage.svelte';
	import {
		createPortfolioKeyPoint,
		createPortfolioProject,
		createPortfolioTechnology,
		deletePortfolioKeyPoint,
		deletePortfolioProject,
		deletePortfolioTechnology,
		listPortfolioKeyPoints,
		listPortfolioProjects,
		listPortfolioTechnologies,
		updatePortfolioKeyPoint,
		updatePortfolioProject,
		updatePortfolioTechnology
	} from '$lib/api/portfolio';
	import type { ApiError } from '$lib/api/client';
	import type {
		NewPortfolioKeyPointRequest,
		NewPortfolioProjectRequest,
		NewPortfolioTechnologyRequest,
		PortfolioKeyPoint,
		PortfolioProject,
		PortfolioTechnology,
		UpdatePortfolioKeyPointRequest,
		UpdatePortfolioProjectRequest,
		UpdatePortfolioTechnologyRequest
	} from '$lib/types';
	import Button from '$lib/components/ui/Button.svelte';
	import TextArea from '$lib/components/ui/TextArea.svelte';
	import TextInput from '$lib/components/ui/TextInput.svelte';

	let { resumeId } = $props<{ resumeId: number }>();

	type ProjectDraft = {
		id: number;
		project_name: string;
		image_url: string;
		project_link: string;
		source_code_link: string;
		description: string;
		display_order: string;
	};

	type KeyPointDraft = { id: number; key_point: string; display_order: string };
	type TechDraft = { id: number; technology_name: string; display_order: string };

	let loading = $state(true);
	let error = $state<string | null>(null);
	let drafts = $state<ProjectDraft[]>([]);
	let savedProjectSigById = $state<Record<number, string>>({});
	let collapsedById = $state<Record<number, boolean>>({});
	let draggingId = $state<number | null>(null);
	let dragOverId = $state<number | null>(null);
	let reordering = $state(false);

	let keyPoints = $state<Record<number, KeyPointDraft[]>>({});
	let technologies = $state<Record<number, TechDraft[]>>({});
	let savedKeyPointSigById = $state<Record<number, string>>({});
	let savedTechSigById = $state<Record<number, string>>({});
	let keyPointDragging = $state<{ group: number; id: number } | null>(null);
	let keyPointDragOver = $state<{ group: number; id: number } | null>(null);
	let techDragging = $state<{ group: number; id: number } | null>(null);
	let techDragOver = $state<{ group: number; id: number } | null>(null);

	let kpLoading = $state<Record<number, boolean>>({});
	let techLoading = $state<Record<number, boolean>>({});

	let newKeyPointText = $state<Record<number, string>>({});
	let newTechText = $state<Record<number, string>>({});

	let creating = $state(false);
	let newName = $state('');
	let newImage = $state('');
	let newProjectLink = $state('');
	let newSourceLink = $state('');
	let newDescription = $state('');

	const displayOrderReorder = createDisplayOrderReorder<ProjectDraft>({
		getDrafts: () => drafts,
		setDrafts: (next) => (drafts = next),
		getSavedSigs: () => savedProjectSigById,
		setSavedSigs: (next) => (savedProjectSigById = next),
		getReordering: () => reordering,
		setReordering: (next) => (reordering = next),
		setError: (message) => (error = message),
		getErrorMessage: (e) => (e as ApiError).message,
		parseOrder: toNumberOrNull,
		updateDisplayOrder: (id, display_order) => updatePortfolioProject(id, { display_order }),
		orderStep: 10
	});

	const dragReorder = createCardDragReorder({
		getDraggingId: () => draggingId,
		setDraggingId: (id) => (draggingId = id),
		setDragOverId: (id) => (dragOverId = id),
		getReordering: () => reordering,
		getOrderedIds: () => drafts.map((d) => d.id),
		reorderByIds: displayOrderReorder.reorderByIds
	});

	const keyPointDisplayOrderReorder = createGroupedDisplayOrderReorder<KeyPointDraft, number>({
		getDrafts: (projectId) => keyPoints[projectId] ?? [],
		setDrafts: (projectId, next) => (keyPoints = { ...keyPoints, [projectId]: next }),
		getSavedSigs: () => savedKeyPointSigById,
		setSavedSigs: (next) => (savedKeyPointSigById = next),
		getReordering: () => reordering,
		setReordering: (next) => (reordering = next),
		setError: (message) => (error = message),
		getErrorMessage: (e) => (e as ApiError).message,
		parseOrder: toNumberOrNull,
		updateDisplayOrder: (id, display_order) => updatePortfolioKeyPoint(id, { display_order }),
		orderStep: 10
	});

	const keyPointDragReorder = createGroupedDragReorder<number>({
		getDragging: () => keyPointDragging,
		setDragging: (item) => (keyPointDragging = item),
		setDragOver: (item) => (keyPointDragOver = item),
		getReordering: () => reordering,
		getOrderedIds: (projectId) => (keyPoints[projectId] ?? []).map((kp) => kp.id),
		reorderByIds: keyPointDisplayOrderReorder.reorderByIds
	});

	const techDisplayOrderReorder = createGroupedDisplayOrderReorder<TechDraft, number>({
		getDrafts: (projectId) => technologies[projectId] ?? [],
		setDrafts: (projectId, next) => (technologies = { ...technologies, [projectId]: next }),
		getSavedSigs: () => savedTechSigById,
		setSavedSigs: (next) => (savedTechSigById = next),
		getReordering: () => reordering,
		setReordering: (next) => (reordering = next),
		setError: (message) => (error = message),
		getErrorMessage: (e) => (e as ApiError).message,
		parseOrder: toNumberOrNull,
		updateDisplayOrder: (id, display_order) => updatePortfolioTechnology(id, { display_order }),
		orderStep: 10
	});

	const techDragReorder = createGroupedDragReorder<number>({
		getDragging: () => techDragging,
		setDragging: (item) => (techDragging = item),
		setDragOver: (item) => (techDragOver = item),
		getReordering: () => reordering,
		getOrderedIds: (projectId) => (technologies[projectId] ?? []).map((t) => t.id),
		reorderByIds: techDisplayOrderReorder.reorderByIds
	});

	function toNullable(value: string): string | null {
		const t = value.trim();
		return t.length === 0 ? null : t;
	}

	function toNumberOrNull(value: string): number | null {
		const t = value.trim();
		if (t.length === 0) return null;
		const n = Number(t);
		return Number.isFinite(n) ? n : null;
	}

	function toDraft(p: PortfolioProject): ProjectDraft {
		return {
			id: p.id,
			project_name: p.project_name,
			image_url: p.image_url ?? '',
			project_link: p.project_link ?? '',
			source_code_link: p.source_code_link ?? '',
			description: p.description ?? '',
			display_order: p.display_order == null ? '' : String(p.display_order)
		};
	}

	function toKeyPointDraft(p: PortfolioKeyPoint): KeyPointDraft {
		return {
			id: p.id,
			key_point: p.key_point,
			display_order: p.display_order == null ? '' : String(p.display_order)
		};
	}

	function toTechDraft(t: PortfolioTechnology): TechDraft {
		return {
			id: t.id,
			technology_name: t.technology_name,
			display_order: t.display_order == null ? '' : String(t.display_order)
		};
	}

	function sigProject(d: ProjectDraft): string {
		return JSON.stringify({
			project_name: d.project_name.trim(),
			image_url: toNullable(d.image_url),
			project_link: toNullable(d.project_link),
			source_code_link: toNullable(d.source_code_link),
			description: toNullable(d.description),
			display_order: toNumberOrNull(d.display_order)
		});
	}

	function isProjectDirty(d: ProjectDraft): boolean {
		return savedProjectSigById[d.id] !== sigProject(d);
	}

	function sigKeyPoint(d: KeyPointDraft): string {
		return JSON.stringify({
			key_point: d.key_point.trim(),
			display_order: toNumberOrNull(d.display_order)
		});
	}

	function isKeyPointDirty(d: KeyPointDraft): boolean {
		return savedKeyPointSigById[d.id] !== sigKeyPoint(d);
	}

	function sigTech(d: TechDraft): string {
		return JSON.stringify({
			technology_name: d.technology_name.trim(),
			display_order: toNumberOrNull(d.display_order)
		});
	}

	function isTechDirty(d: TechDraft): boolean {
		return savedTechSigById[d.id] !== sigTech(d);
	}

	async function refresh() {
		loading = true;
		error = null;
		try {
			const items = await listPortfolioProjects(resumeId);
			const sorted = [...items].sort(byDisplayOrder);
			const ds = sorted.map(toDraft);
			drafts = ds;
			savedProjectSigById = Object.fromEntries(ds.map((d) => [d.id, sigProject(d)]));
			collapsedById = Object.fromEntries(ds.map((d) => [d.id, collapsedById[d.id] ?? true]));
			const kpMap: Record<number, KeyPointDraft[]> = {};
			const techMap: Record<number, TechDraft[]> = {};
			for (const p of sorted) {
				kpMap[p.id] = [];
				techMap[p.id] = [];
			}
			keyPoints = kpMap;
			technologies = techMap;
			for (const p of sorted) {
				void loadKeyPoints(p.id);
				void loadTechnologies(p.id);
			}
		} catch (e) {
			const err = e as ApiError;
			error = err.message;
		} finally {
			loading = false;
		}
	}

	async function loadKeyPoints(projectId: number) {
		kpLoading = { ...kpLoading, [projectId]: true };
		try {
			const points = await listPortfolioKeyPoints(resumeId, projectId);
			const sorted = [...points].sort(byDisplayOrder);
			const ds = sorted.map(toKeyPointDraft);
			keyPoints = { ...keyPoints, [projectId]: ds };
			savedKeyPointSigById = {
				...savedKeyPointSigById,
				...Object.fromEntries(ds.map((d) => [d.id, sigKeyPoint(d)]))
			};
		} catch {
			keyPoints = { ...keyPoints, [projectId]: [] };
		} finally {
			kpLoading = { ...kpLoading, [projectId]: false };
		}
	}

	async function loadTechnologies(projectId: number) {
		techLoading = { ...techLoading, [projectId]: true };
		try {
			const items = await listPortfolioTechnologies(resumeId, projectId);
			const sorted = [...items].sort(byDisplayOrder);
			const ds = sorted.map(toTechDraft);
			technologies = { ...technologies, [projectId]: ds };
			savedTechSigById = {
				...savedTechSigById,
				...Object.fromEntries(ds.map((d) => [d.id, sigTech(d)]))
			};
		} catch {
			technologies = { ...technologies, [projectId]: [] };
		} finally {
			techLoading = { ...techLoading, [projectId]: false };
		}
	}

	onMount(() => {
		void refresh();
	});

	async function handleCreate() {
		creating = true;
		error = null;
		try {
			const payload: NewPortfolioProjectRequest = {
				project_name: newName.trim(),
				image_url: toNullable(newImage),
				project_link: toNullable(newProjectLink),
				source_code_link: toNullable(newSourceLink),
				description: toNullable(newDescription),
				display_order: null
			};
			await createPortfolioProject(resumeId, payload);
			newName = '';
			newImage = '';
			newProjectLink = '';
			newSourceLink = '';
			newDescription = '';
			await refresh();
		} catch (e) {
			const err = e as ApiError;
			error = err.message;
		} finally {
			creating = false;
		}
	}

	async function handleSave(d: ProjectDraft) {
		error = null;
		try {
			const payload: UpdatePortfolioProjectRequest = {
				project_name: d.project_name.trim(),
				image_url: toNullable(d.image_url),
				project_link: toNullable(d.project_link),
				source_code_link: toNullable(d.source_code_link),
				description: toNullable(d.description),
				display_order: toNumberOrNull(d.display_order)
			};
			await updatePortfolioProject(d.id, payload);
			await refresh();
		} catch (e) {
			const err = e as ApiError;
			error = err.message;
		}
	}

	async function handleDelete(projectId: number) {
		const ok = confirm('Delete this portfolio project?');
		if (!ok) return;
		error = null;
		try {
			await deletePortfolioProject(projectId);
			await refresh();
		} catch (e) {
			const err = e as ApiError;
			error = err.message;
		}
	}

	async function handleAddKeyPoint(projectId: number) {
		const text = (newKeyPointText[projectId] ?? '').trim();
		if (text.length === 0) return;
		error = null;
		try {
			const payload: NewPortfolioKeyPointRequest = { key_point: text, display_order: null };
			await createPortfolioKeyPoint(resumeId, projectId, payload);
			newKeyPointText = { ...newKeyPointText, [projectId]: '' };
			await loadKeyPoints(projectId);
		} catch (e) {
			const err = e as ApiError;
			error = err.message;
		}
	}

	async function handleSaveKeyPoint(projectId: number, kp: KeyPointDraft) {
		error = null;
		try {
			const payload: UpdatePortfolioKeyPointRequest = {
				key_point: kp.key_point.trim(),
				display_order: toNumberOrNull(kp.display_order)
			};
			await updatePortfolioKeyPoint(kp.id, payload);
			await loadKeyPoints(projectId);
		} catch (e) {
			const err = e as ApiError;
			error = err.message;
		}
	}

	async function handleDeleteKeyPoint(projectId: number, keyPointId: number) {
		const ok = confirm('Delete this key point?');
		if (!ok) return;
		error = null;
		try {
			await deletePortfolioKeyPoint(keyPointId);
			await loadKeyPoints(projectId);
		} catch (e) {
			const err = e as ApiError;
			error = err.message;
		}
	}

	async function handleAddTechnology(projectId: number) {
		const text = (newTechText[projectId] ?? '').trim();
		if (text.length === 0) return;
		error = null;
		try {
			const payload: NewPortfolioTechnologyRequest = {
				technology_name: text,
				display_order: null
			};
			await createPortfolioTechnology(resumeId, projectId, payload);
			newTechText = { ...newTechText, [projectId]: '' };
			await loadTechnologies(projectId);
		} catch (e) {
			const err = e as ApiError;
			error = err.message;
		}
	}

	async function handleSaveTechnology(projectId: number, t: TechDraft) {
		error = null;
		try {
			const payload: UpdatePortfolioTechnologyRequest = {
				technology_name: t.technology_name.trim(),
				display_order: toNumberOrNull(t.display_order)
			};
			await updatePortfolioTechnology(t.id, payload);
			await loadTechnologies(projectId);
		} catch (e) {
			const err = e as ApiError;
			error = err.message;
		}
	}

	async function handleDeleteTechnology(projectId: number, techId: number) {
		const ok = confirm('Delete this technology?');
		if (!ok) return;
		error = null;
		try {
			await deletePortfolioTechnology(techId);
			await loadTechnologies(projectId);
		} catch (e) {
			const err = e as ApiError;
			error = err.message;
		}
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
			<Button onclick={handleCreate} disabled={creating || newName.trim().length === 0}>
				{creating ? 'Adding…' : 'Add project'}
			</Button>
		</CardActions>
	</Card>

	<SectionMessage
		{error}
		{loading}
		empty={!loading && drafts.length === 0}
		emptyText="No portfolio projects yet."
	>
		{#each drafts as d (d.id)}
			<CollapsibleCard
				ariaLabel="Portfolio project"
				collapsed={collapsedById[d.id] ?? true}
				oncollapsedchange={(next) => (collapsedById = { ...collapsedById, [d.id]: next })}
				draggable
				dragDisabled={loading || reordering}
				dragging={draggingId === d.id}
				dragLabel="Reorder portfolio project"
				ondragstart={(e) => dragReorder.handleDragStart(d.id, e)}
				ondragend={() => dragReorder.handleDragEnd()}
				onkeydown={(e) => dragReorder.handleHandleKeydown(d.id, e)}
				dropOver={draggingId != null && dragOverId === d.id && draggingId !== d.id}
				ondragover={(e) => dragReorder.handleDragOver(d.id, e)}
				ondrop={(e) => dragReorder.handleDrop(d.id, e)}
			>
				{#snippet titleHeader()}
					<div>{d.project_name.trim()}</div>
				{/snippet}
				<FieldsWrap style="padding-top: 6px;">
					<TextInput label="Project name" bind:value={d.project_name} title="Project name/title." />
					<TextInput
						label="Image URL"
						bind:value={d.image_url}
						title="Optional. Preview image URL."
					/>
					<TextInput
						label="Project link"
						bind:value={d.project_link}
						title="Optional. Live project/demo link."
					/>
					<TextInput
						label="Source code link"
						bind:value={d.source_code_link}
						title="Optional. Source code repository link."
					/>
				</FieldsWrap>
				<TextArea
					label="Description"
					bind:value={d.description}
					rows={2}
					title="Optional. Description/details."
				/>
				<CardActions>
					{#if isProjectDirty(d)}
						<Button onclick={() => handleSave(d)}>Save</Button>
					{/if}
					<Button variant="danger" onclick={() => handleDelete(d.id)}>Delete</Button>
				</CardActions>

				<NestedList
					title="Key points"
					loading={kpLoading[d.id] ?? false}
					empty={(keyPoints[d.id] ?? []).length === 0}
					emptyText="No key points."
				>
					{#each keyPoints[d.id] ?? [] as kp (kp.id)}
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
							ondragover={(e) => keyPointDragReorder.handleDragOver(d.id, kp.id, e)}
							ondrop={(e) => keyPointDragReorder.handleDrop(d.id, kp.id, e)}
						>
							<DragHandle
								ondragstart={(e) => keyPointDragReorder.handleDragStart(d.id, kp.id, e)}
								ondragend={() => keyPointDragReorder.handleDragEnd()}
								onkeydown={(e) => keyPointDragReorder.handleHandleKeydown(d.id, kp.id, e)}
								disabled={loading || reordering || (kpLoading[d.id] ?? false)}
								dragging={keyPointDragging != null &&
									keyPointDragging.group === d.id &&
									keyPointDragging.id === kp.id}
								label="Reorder portfolio key point"
							/>
							<TextInput
								label="Key point"
								bind:value={kp.key_point}
								title="Key point text."
								onkeydown={(e) => {
									if (e.key === 'Enter' && (kp.key_point ?? '').trim().length > 0) {
										handleSaveKeyPoint(d.id, kp);
									}
								}}
							/>
							{#if isKeyPointDirty(kp)}
								<Button onclick={() => handleSaveKeyPoint(d.id, kp)}>Save</Button>
							{/if}
							<Button variant="danger" onclick={() => handleDeleteKeyPoint(d.id, kp.id)}>
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
							if (e.key === 'Enter' && (newKeyPointText[d.id] ?? '').trim().length > 0) {
								handleAddKeyPoint(d.id);
							}
						}}
					/>
					<Button
						onclick={() => handleAddKeyPoint(d.id)}
						disabled={(newKeyPointText[d.id] ?? '').trim().length === 0}
					>
						Add
					</Button>
				</FieldsWrap>

				<NestedList
					title="Technologies"
					loading={techLoading[d.id] ?? false}
					empty={(technologies[d.id] ?? []).length === 0}
					emptyText="No technologies."
				>
					{#each technologies[d.id] ?? [] as t (t.id)}
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
							ondragover={(e) => techDragReorder.handleDragOver(d.id, t.id, e)}
							ondrop={(e) => techDragReorder.handleDrop(d.id, t.id, e)}
						>
							<DragHandle
								ondragstart={(e) => techDragReorder.handleDragStart(d.id, t.id, e)}
								ondragend={() => techDragReorder.handleDragEnd()}
								onkeydown={(e) => techDragReorder.handleHandleKeydown(d.id, t.id, e)}
								disabled={loading || reordering || (techLoading[d.id] ?? false)}
								dragging={techDragging != null &&
									techDragging.group === d.id &&
									techDragging.id === t.id}
								label="Reorder portfolio technology"
							/>
							<TextInput
								label="Technology"
								bind:value={t.technology_name}
								title="Technology name."
								onkeydown={(e) => {
									if (e.key === 'Enter' && (t.technology_name ?? '').trim().length > 0) {
										handleSaveTechnology(d.id, t);
									}
								}}
							/>
							{#if isTechDirty(t)}
								<Button onclick={() => handleSaveTechnology(d.id, t)}>Save</Button>
							{/if}
							<Button variant="danger" onclick={() => handleDeleteTechnology(d.id, t.id)}>
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
						disabled={(newTechText[d.id] ?? '').trim().length === 0}
					>
						Add
					</Button>
				</FieldsWrap>
			</CollapsibleCard>
		{/each}
	</SectionMessage>
</SectionShell>
