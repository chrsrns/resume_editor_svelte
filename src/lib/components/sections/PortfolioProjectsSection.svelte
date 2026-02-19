<script lang="ts">
	import { onMount } from 'svelte';
	import SectionShell from '$lib/components/sections/SectionShell.svelte';
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

	let keyPoints = $state<Record<number, KeyPointDraft[]>>({});
	let technologies = $state<Record<number, TechDraft[]>>({});

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
	let newDisplayOrder = $state('');

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

	async function refresh() {
		loading = true;
		error = null;
		try {
			const items = await listPortfolioProjects(resumeId);
			drafts = items.map(toDraft);
			const kpMap: Record<number, KeyPointDraft[]> = {};
			const techMap: Record<number, TechDraft[]> = {};
			for (const p of items) {
				kpMap[p.id] = [];
				techMap[p.id] = [];
			}
			keyPoints = kpMap;
			technologies = techMap;
			for (const p of items) {
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
			keyPoints = { ...keyPoints, [projectId]: points.map(toKeyPointDraft) };
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
			technologies = { ...technologies, [projectId]: items.map(toTechDraft) };
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
				display_order: toNumberOrNull(newDisplayOrder)
			};
			await createPortfolioProject(resumeId, payload);
			newName = '';
			newImage = '';
			newProjectLink = '';
			newSourceLink = '';
			newDescription = '';
			newDisplayOrder = '';
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
	{#if error}
		<p class="error">{error}</p>
	{/if}

	<div class="newCard">
		<div class="grid">
			<input
				class="input"
				placeholder="Project name"
				bind:value={newName}
				title="Project name/title."
			/>
			<input
				class="input"
				placeholder="Image URL"
				bind:value={newImage}
				title="Optional. Link to a preview image for the project."
			/>
			<input
				class="input"
				placeholder="Project link"
				bind:value={newProjectLink}
				title="Optional. Link to the live project/demo."
			/>
			<input
				class="input"
				placeholder="Source code link"
				bind:value={newSourceLink}
				title="Optional. Link to the source repository (e.g. GitHub)."
			/>
			<input
				class="input"
				type="number"
				placeholder="#"
				bind:value={newDisplayOrder}
				title="Optional. Order for sorting (lower shows first)."
			/>
		</div>
		<textarea
			class="textarea"
			placeholder="Description"
			bind:value={newDescription}
			rows={2}
			title="Optional. Short summary of what you built and the impact."
		></textarea>
		<button
			class="button"
			type="button"
			onclick={handleCreate}
			disabled={creating || newName.trim().length === 0}
		>
			{creating ? 'Adding…' : 'Add project'}
		</button>
	</div>

	{#if loading}
		<p>Loading…</p>
	{:else if drafts.length === 0}
		<p class="muted">No portfolio projects yet.</p>
	{:else}
		<div class="list">
			{#each drafts as d (d.id)}
				<div class="card">
					<div class="grid">
						<input class="input" bind:value={d.project_name} title="Project name/title." />
						<input class="input" bind:value={d.image_url} title="Optional. Preview image URL." />
						<input
							class="input"
							bind:value={d.project_link}
							title="Optional. Live project/demo link."
						/>
						<input
							class="input"
							bind:value={d.source_code_link}
							title="Optional. Source code repository link."
						/>
						<input
							class="input"
							type="number"
							placeholder="#"
							bind:value={d.display_order}
							title="Optional. Order for sorting (lower shows first)."
						/>
					</div>
					<textarea
						class="textarea"
						bind:value={d.description}
						rows={2}
						title="Optional. Description/details."
					></textarea>
					<div class="actions">
						<button class="button" type="button" onclick={() => handleSave(d)}>Save</button>
						<button class="button danger" type="button" onclick={() => handleDelete(d.id)}>
							Delete
						</button>
					</div>

					<div class="nested">
						<div class="nestedHead">
							<strong>Key points</strong>
							{#if kpLoading[d.id]}
								<span class="muted">Loading…</span>
							{/if}
						</div>

						<div class="addRow">
							<input
								class="input"
								placeholder="Add key point"
								title="Add a bullet point about this project."
								value={newKeyPointText[d.id] ?? ''}
								oninput={(e) =>
									(newKeyPointText = {
										...newKeyPointText,
										[d.id]: (e.target as HTMLInputElement).value
									})}
							/>
							<button class="button" type="button" onclick={() => handleAddKeyPoint(d.id)}>
								Add
							</button>
						</div>

						{#if (keyPoints[d.id] ?? []).length === 0}
							<p class="muted">No key points.</p>
						{:else}
							{#each keyPoints[d.id] ?? [] as kp (kp.id)}
								<div class="itemRow">
									<input class="input" bind:value={kp.key_point} title="Key point text." />
									<input
										class="input small"
										type="number"
										placeholder="#"
										bind:value={kp.display_order}
										title="Optional. Order for sorting (lower shows first)."
									/>
									<button class="button" type="button" onclick={() => handleSaveKeyPoint(d.id, kp)}>
										Save
									</button>
									<button
										class="button danger"
										type="button"
										onclick={() => handleDeleteKeyPoint(d.id, kp.id)}
									>
										Delete
									</button>
								</div>
							{/each}
						{/if}
					</div>

					<div class="nested">
						<div class="nestedHead">
							<strong>Technologies</strong>
							{#if techLoading[d.id]}
								<span class="muted">Loading…</span>
							{/if}
						</div>

						<div class="addRow">
							<input
								class="input"
								placeholder="Add technology"
								title="Add a technology used (e.g. Rust, Svelte, PostgreSQL)."
								value={newTechText[d.id] ?? ''}
								oninput={(e) =>
									(newTechText = { ...newTechText, [d.id]: (e.target as HTMLInputElement).value })}
							/>
							<button class="button" type="button" onclick={() => handleAddTechnology(d.id)}>
								Add
							</button>
						</div>

						{#if (technologies[d.id] ?? []).length === 0}
							<p class="muted">No technologies.</p>
						{:else}
							{#each technologies[d.id] ?? [] as t (t.id)}
								<div class="itemRow">
									<input class="input" bind:value={t.technology_name} title="Technology name." />
									<input
										class="input small"
										type="number"
										placeholder="#"
										bind:value={t.display_order}
										title="Optional. Order for sorting (lower shows first)."
									/>
									<button
										class="button"
										type="button"
										onclick={() => handleSaveTechnology(d.id, t)}
									>
										Save
									</button>
									<button
										class="button danger"
										type="button"
										onclick={() => handleDeleteTechnology(d.id, t.id)}
									>
										Delete
									</button>
								</div>
							{/each}
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</SectionShell>

<style>
	.list {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.card,
	.newCard {
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		padding: 12px;
		margin-bottom: 12px;
		background: #f8fafc;
	}

	.grid {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}

	.grid .input {
		flex: 1 1 220px;
		min-width: 160px;
	}

	.grid input[type='number'] {
		flex: 0 1 90px;
		min-width: 80px;
	}

	.textarea {
		margin-top: 10px;
		width: 100%;
		box-sizing: border-box;
		padding: 10px 12px;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		background: white;
		resize: vertical;
	}

	.actions {
		margin-top: 10px;
		display: flex;
		gap: 10px;
	}

	.nested {
		margin-top: 12px;
		padding-top: 12px;
		border-top: 1px solid #e2e8f0;
	}

	.nestedHead {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.addRow {
		margin-top: 10px;
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		align-items: center;
	}

	.addRow .input {
		flex: 1 1 260px;
		min-width: 180px;
	}

	.itemRow {
		margin-top: 8px;
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		align-items: center;
	}

	.itemRow .input:not(.small) {
		flex: 1 1 260px;
		min-width: 180px;
	}

	.itemRow .input.small {
		flex: 0 1 90px;
		min-width: 80px;
	}

	.input {
		padding: 10px 12px;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		background: white;
	}

	.input.small {
		padding: 10px 8px;
	}

	.button {
		padding: 10px 12px;
		margin-top: 10px;
		border: 1px solid #0f172a;
		border-radius: 8px;
		background: #0f172a;
		color: white;
		cursor: pointer;
	}

	.button.danger {
		border-color: #b91c1c;
		background: #b91c1c;
	}

	.button[disabled] {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.error {
		color: #b91c1c;
	}

	.muted {
		color: #475569;
	}
</style>
