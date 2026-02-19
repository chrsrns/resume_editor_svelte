<script lang="ts">
	import { onMount } from 'svelte';
	import SectionShell from '$lib/components/sections/SectionShell.svelte';
	import {
		createWorkExperience,
		createWorkExperienceKeyPoint,
		deleteWorkExperience,
		deleteWorkExperienceKeyPoint,
		listWorkExperienceKeyPoints,
		listWorkExperiences,
		updateWorkExperience,
		updateWorkExperienceKeyPoint
	} from '$lib/api/work-experience';
	import type { ApiError } from '$lib/api/client';
	import type {
		NewWorkExperienceKeyPointRequest,
		NewWorkExperienceRequest,
		UpdateWorkExperienceKeyPointRequest,
		UpdateWorkExperienceRequest,
		WorkExperience,
		WorkExperienceKeyPoint
	} from '$lib/types';

	let { resumeId } = $props<{ resumeId: number }>();

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

	let loading = $state(true);
	let error = $state<string | null>(null);
	let drafts = $state<WorkDraft[]>([]);
	let keyPoints = $state<Record<number, KeyPointDraft[]>>({});
	let keyPointLoading = $state<Record<number, boolean>>({});
	let newKeyPointText = $state<Record<number, string>>({});

	let creating = $state(false);
	let newTitle = $state('');
	let newCompany = $state('');
	let newStart = $state('');
	let newEnd = $state('');
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

	function toDraft(w: WorkExperience): WorkDraft {
		return {
			id: w.id,
			job_title: w.job_title,
			company_name: w.company_name,
			start_date: w.start_date,
			end_date: w.end_date ?? '',
			description: w.description ?? '',
			display_order: w.display_order == null ? '' : String(w.display_order)
		};
	}

	function toKeyPointDraft(p: WorkExperienceKeyPoint): KeyPointDraft {
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
			const items = await listWorkExperiences(resumeId);
			drafts = items.map(toDraft);
			const map: Record<number, KeyPointDraft[]> = {};
			for (const w of items) map[w.id] = [];
			keyPoints = map;
			for (const w of items) void loadKeyPoints(w.id);
		} catch (e) {
			const err = e as ApiError;
			error = err.message;
		} finally {
			loading = false;
		}
	}

	async function loadKeyPoints(workId: number) {
		keyPointLoading = { ...keyPointLoading, [workId]: true };
		try {
			const points = await listWorkExperienceKeyPoints(resumeId, workId);
			keyPoints = { ...keyPoints, [workId]: points.map(toKeyPointDraft) };
		} catch {
			keyPoints = { ...keyPoints, [workId]: [] };
		} finally {
			keyPointLoading = { ...keyPointLoading, [workId]: false };
		}
	}

	onMount(() => {
		void refresh();
	});

	async function handleCreate() {
		creating = true;
		error = null;
		try {
			const payload: NewWorkExperienceRequest = {
				job_title: newTitle.trim(),
				company_name: newCompany.trim(),
				start_date: newStart,
				end_date: toNullable(newEnd),
				description: toNullable(newDescription),
				display_order: toNumberOrNull(newDisplayOrder)
			};
			await createWorkExperience(resumeId, payload);
			newTitle = '';
			newCompany = '';
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

	async function handleSave(d: WorkDraft) {
		error = null;
		try {
			const payload: UpdateWorkExperienceRequest = {
				job_title: d.job_title.trim(),
				company_name: d.company_name.trim(),
				start_date: d.start_date,
				end_date: toNullable(d.end_date),
				description: toNullable(d.description),
				display_order: toNumberOrNull(d.display_order)
			};
			await updateWorkExperience(d.id, payload);
			await refresh();
		} catch (e) {
			const err = e as ApiError;
			error = err.message;
		}
	}

	async function handleDelete(workId: number) {
		const ok = confirm('Delete this work experience?');
		if (!ok) return;
		error = null;
		try {
			await deleteWorkExperience(workId);
			await refresh();
		} catch (e) {
			const err = e as ApiError;
			error = err.message;
		}
	}

	async function handleAddKeyPoint(workId: number) {
		const text = (newKeyPointText[workId] ?? '').trim();
		if (text.length === 0) return;
		error = null;
		try {
			const payload: NewWorkExperienceKeyPointRequest = { key_point: text, display_order: null };
			await createWorkExperienceKeyPoint(resumeId, workId, payload);
			newKeyPointText = { ...newKeyPointText, [workId]: '' };
			await loadKeyPoints(workId);
		} catch (e) {
			const err = e as ApiError;
			error = err.message;
		}
	}

	async function handleSaveKeyPoint(workId: number, kp: KeyPointDraft) {
		error = null;
		try {
			const payload: UpdateWorkExperienceKeyPointRequest = {
				key_point: kp.key_point.trim(),
				display_order: toNumberOrNull(kp.display_order)
			};
			await updateWorkExperienceKeyPoint(kp.id, payload);
			await loadKeyPoints(workId);
		} catch (e) {
			const err = e as ApiError;
			error = err.message;
		}
	}

	async function handleDeleteKeyPoint(workId: number, keyPointId: number) {
		const ok = confirm('Delete this key point?');
		if (!ok) return;
		error = null;
		try {
			await deleteWorkExperienceKeyPoint(keyPointId);
			await loadKeyPoints(workId);
		} catch (e) {
			const err = e as ApiError;
			error = err.message;
		}
	}
</script>

<SectionShell title="Work experience" description="Work experiences and key points.">
	{#if error}
		<p class="error">{error}</p>
	{/if}

	<div class="newCard">
		<div class="grid">
			<input
				class="input"
				placeholder="Job title"
				bind:value={newTitle}
				title="Role/title (e.g. Software Engineer)."
			/>
			<input
				class="input"
				placeholder="Company"
				bind:value={newCompany}
				title="Company/organization name."
			/>
			<input class="input" type="date" bind:value={newStart} title="Start date." />
			<input
				class="input"
				type="date"
				bind:value={newEnd}
				title="Optional. End date (leave blank if current)."
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
			title="Optional. Summary of responsibilities/impact."
		></textarea>
		<button
			class="button"
			type="button"
			onclick={handleCreate}
			disabled={creating ||
				newTitle.trim().length === 0 ||
				newCompany.trim().length === 0 ||
				newStart.trim().length === 0}
		>
			{creating ? 'Adding…' : 'Add work experience'}
		</button>
	</div>

	{#if loading}
		<p>Loading…</p>
	{:else if drafts.length === 0}
		<p class="muted">No work experiences yet.</p>
	{:else}
		<div class="list">
			{#each drafts as d (d.id)}
				<div class="card">
					<div class="grid">
						<input class="input" bind:value={d.job_title} title="Job title/role." />
						<input class="input" bind:value={d.company_name} title="Company/organization." />
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
								title="Add a bullet point for this work experience."
								value={newKeyPointText[d.id] ?? ''}
								oninput={(e) =>
									(newKeyPointText = {
										...newKeyPointText,
										[d.id]: (e.target as HTMLInputElement).value
									})}
							/>
							<button
								class="button"
								type="button"
								onclick={() => handleAddKeyPoint(d.id)}
								title="Add key point"
							>
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
		margin-bottom: 12px;
		background: #f8fafc;
	}

	.grid {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}

	.grid .input {
		flex: 1 1 240px;
		min-width: 180px;
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
