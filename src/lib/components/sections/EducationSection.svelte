<script lang="ts">
	import { onMount } from 'svelte';
	import SectionShell from '$lib/components/sections/SectionShell.svelte';
	import {
		createEducation,
		createEducationKeyPoint,
		deleteEducation,
		deleteEducationKeyPoint,
		listEducationKeyPoints,
		listEducations,
		updateEducation,
		updateEducationKeyPoint
	} from '$lib/api/education';
	import type { ApiError } from '$lib/api/client';
	import type {
		Education,
		EducationKeyPoint,
		NewEducationKeyPointRequest,
		NewEducationRequest,
		UpdateEducationKeyPointRequest,
		UpdateEducationRequest
	} from '$lib/types';

	let { resumeId } = $props<{ resumeId: number }>();

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

	let loading = $state(true);
	let error = $state<string | null>(null);
	let drafts = $state<EducationDraft[]>([]);
	let keyPoints = $state<Record<number, KeyPointDraft[]>>({});
	let keyPointLoading = $state<Record<number, boolean>>({});

	let creating = $state(false);
	let newStage = $state('');
	let newInstitution = $state('');
	let newDegree = $state('');
	let newStart = $state('');
	let newEnd = $state('');
	let newDescription = $state('');
	let newDisplayOrder = $state('');

	let newKeyPointText = $state<Record<number, string>>({});

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

	function toDraft(e: Education): EducationDraft {
		return {
			id: e.id,
			education_stage: e.education_stage,
			institution_name: e.institution_name,
			degree: String(e.degree ?? ''),
			start_date: e.start_date,
			end_date: e.end_date ?? '',
			description: e.description ?? '',
			display_order: e.display_order == null ? '' : String(e.display_order)
		};
	}

	function toKeyPointDraft(p: EducationKeyPoint): KeyPointDraft {
		return {
			id: p.id,
			key_point: p.key_point,
			display_order: p.display_order == null ? '' : String(p.display_order)
		};
	}

	async function refresh() {
		loading = true;
		error = null;
		try {
			const items = await listEducations(resumeId);
			drafts = items.map(toDraft);
			const newMap: Record<number, KeyPointDraft[]> = {};
			for (const e of items) {
				newMap[e.id] = [];
			}
			keyPoints = newMap;
			for (const e of items) {
				void loadKeyPoints(e.id);
			}
		} catch (e) {
			const err = e as ApiError;
			error = err.message;
		} finally {
			loading = false;
		}
	}

	async function loadKeyPoints(educationId: number) {
		keyPointLoading = { ...keyPointLoading, [educationId]: true };
		try {
			const points = await listEducationKeyPoints(resumeId, educationId);
			keyPoints = { ...keyPoints, [educationId]: points.map(toKeyPointDraft) };
		} catch {
			keyPoints = { ...keyPoints, [educationId]: [] };
		} finally {
			keyPointLoading = { ...keyPointLoading, [educationId]: false };
		}
	}

	onMount(() => {
		void refresh();
	});

	async function handleCreate() {
		creating = true;
		error = null;
		try {
			const payload: NewEducationRequest = {
				education_stage: newStage.trim(),
				institution_name: newInstitution.trim(),
				degree: toNullable(newDegree),
				start_date: newStart,
				end_date: toNullable(newEnd),
				description: toNullable(newDescription),
				display_order: toNumberOrNull(newDisplayOrder)
			};
			await createEducation(resumeId, payload);
			newStage = '';
			newInstitution = '';
			newDegree = '';
			newStart = '';
			newEnd = '';
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

	async function handleSave(d: EducationDraft) {
		error = null;
		try {
			const payload: UpdateEducationRequest = {
				education_stage: d.education_stage.trim(),
				institution_name: d.institution_name.trim(),
				degree: toNullable(d.degree),
				start_date: d.start_date,
				end_date: toNullable(d.end_date),
				description: toNullable(d.description),
				display_order: toNumberOrNull(d.display_order)
			};
			await updateEducation(d.id, payload);
			await refresh();
		} catch (e) {
			const err = e as ApiError;
			error = err.message;
		}
	}

	async function handleDelete(educationId: number) {
		const ok = confirm('Delete this education entry?');
		if (!ok) return;
		error = null;
		try {
			await deleteEducation(educationId);
			await refresh();
		} catch (e) {
			const err = e as ApiError;
			error = err.message;
		}
	}

	async function handleAddKeyPoint(educationId: number) {
		const text = (newKeyPointText[educationId] ?? '').trim();
		if (text.length === 0) return;
		error = null;
		try {
			const payload: NewEducationKeyPointRequest = { key_point: text, display_order: null };
			await createEducationKeyPoint(resumeId, educationId, payload);
			newKeyPointText = { ...newKeyPointText, [educationId]: '' };
			await loadKeyPoints(educationId);
		} catch (e) {
			const err = e as ApiError;
			error = err.message;
		}
	}

	async function handleSaveKeyPoint(educationId: number, kp: KeyPointDraft) {
		error = null;
		try {
			const payload: UpdateEducationKeyPointRequest = {
				key_point: kp.key_point.trim(),
				display_order: toNumberOrNull(kp.display_order)
			};
			await updateEducationKeyPoint(kp.id, payload);
			await loadKeyPoints(educationId);
		} catch (e) {
			const err = e as ApiError;
			error = err.message;
		}
	}

	async function handleDeleteKeyPoint(educationId: number, keyPointId: number) {
		const ok = confirm('Delete this key point?');
		if (!ok) return;
		error = null;
		try {
			await deleteEducationKeyPoint(keyPointId);
			await loadKeyPoints(educationId);
		} catch (e) {
			const err = e as ApiError;
			error = err.message;
		}
	}
</script>

<SectionShell title="Education" description="Education entries and key points.">
	{#if error}
		<p class="error">{error}</p>
	{/if}

	<div class="newCard">
		<div class="grid">
			<input
				class="input"
				placeholder="Stage (e.g. Bachelor)"
				bind:value={newStage}
				title="Education stage/level (e.g. High School, Diploma, Bachelor, Master)."
			/>
			<input
				class="input"
				placeholder="Institution"
				bind:value={newInstitution}
				title="School/university/training provider name."
			/>
			<input
				class="input"
				placeholder="Degree"
				bind:value={newDegree}
				title="Optional. Degree/qualification name."
			/>
			<input
				class="input"
				type="date"
				bind:value={newStart}
				title="Start date for this education."
			/>
			<input
				class="input"
				type="date"
				bind:value={newEnd}
				title="Optional. End date (leave blank if ongoing)."
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
			title="Optional. Additional details about the education."
		></textarea>
		<button
			class="button"
			type="button"
			onclick={handleCreate}
			disabled={creating ||
				newStage.trim().length === 0 ||
				newInstitution.trim().length === 0 ||
				newStart.trim().length === 0}
		>
			{creating ? 'Adding…' : 'Add education'}
		</button>
	</div>

	{#if loading}
		<p>Loading…</p>
	{:else if drafts.length === 0}
		<p class="muted">No education entries yet.</p>
	{:else}
		<div class="list">
			{#each drafts as d (d.id)}
				<div class="card">
					<div class="grid">
						<input class="input" bind:value={d.education_stage} title="Education stage/level." />
						<input class="input" bind:value={d.institution_name} title="Institution name." />
						<input
							class="input"
							bind:value={d.degree}
							title="Optional. Degree/qualification name."
						/>
						<input class="input" type="date" bind:value={d.start_date} title="Start date." />
						<input class="input" type="date" bind:value={d.end_date} title="Optional. End date." />
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
						<button class="button danger" type="button" onclick={() => handleDelete(d.id)}
							>Delete</button
						>
					</div>

					<div class="nested">
						<div class="nestedHead">
							<strong>Key points</strong>
							{#if keyPointLoading[d.id]}
								<span class="muted">Loading…</span>
							{/if}
						</div>

						<div class="addKeyPoint">
							<input
								class="input"
								placeholder="Add key point"
								title="Add a bullet point for this education entry."
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
								<div class="kpRow">
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

	.grid input[type='date'] {
		flex: 0 1 170px;
		min-width: 150px;
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

	.addKeyPoint {
		margin-top: 10px;
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		align-items: center;
	}

	.addKeyPoint .input {
		flex: 1 1 260px;
		min-width: 180px;
	}

	.kpRow {
		margin-top: 8px;
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		align-items: center;
	}

	.kpRow .input:not(.small) {
		flex: 1 1 260px;
		min-width: 180px;
	}

	.kpRow .input.small {
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
