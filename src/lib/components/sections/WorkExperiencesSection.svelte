<script lang="ts">
	import { onMount } from 'svelte';
	import SectionShell from '$lib/components/sections/SectionShell.svelte';
	import Card from '$lib/components/sections/shared/Card.svelte';
	import CardActions from '$lib/components/sections/shared/CardActions.svelte';
	import FieldsWrap from '$lib/components/sections/shared/FieldsWrap.svelte';
	import NestedList from '$lib/components/sections/shared/NestedList.svelte';
	import SectionMessage from '$lib/components/sections/shared/SectionMessage.svelte';
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
	import Button from '$lib/components/ui/Button.svelte';
	import TextArea from '$lib/components/ui/TextArea.svelte';
	import TextInput from '$lib/components/ui/TextInput.svelte';

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
	let savedWorkSigById = $state<Record<number, string>>({});
	let keyPoints = $state<Record<number, KeyPointDraft[]>>({});
	let keyPointLoading = $state<Record<number, boolean>>({});
	let newKeyPointText = $state<Record<number, string>>({});
	let savedKeyPointSigById = $state<Record<number, string>>({});

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

	function sigWork(d: WorkDraft): string {
		return JSON.stringify({
			job_title: d.job_title.trim(),
			company_name: d.company_name.trim(),
			start_date: d.start_date,
			end_date: toNullable(d.end_date),
			description: toNullable(d.description),
			display_order: toNumberOrNull(d.display_order)
		});
	}

	function isWorkDirty(d: WorkDraft): boolean {
		return savedWorkSigById[d.id] !== sigWork(d);
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

	async function refresh() {
		loading = true;
		error = null;
		try {
			const items = await listWorkExperiences(resumeId);
			const ds = items.map(toDraft);
			drafts = ds;
			savedWorkSigById = Object.fromEntries(ds.map((d) => [d.id, sigWork(d)]));
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
			const ds = points.map(toKeyPointDraft);
			keyPoints = { ...keyPoints, [workId]: ds };
			savedKeyPointSigById = {
				...savedKeyPointSigById,
				...Object.fromEntries(ds.map((d) => [d.id, sigKeyPoint(d)]))
			};
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
	<Card variant="new">
		<FieldsWrap>
			<TextInput
				placeholder="Job title"
				bind:value={newTitle}
				title="Role/title (e.g. Software Engineer)."
			/>
			<TextInput placeholder="Company" bind:value={newCompany} title="Company/organization name." />
			<TextInput type="date" bind:value={newStart} title="Start date." />
			<TextInput
				type="date"
				bind:value={newEnd}
				title="Optional. End date (leave blank if current)."
			/>
			<TextInput
				small
				type="number"
				placeholder="#"
				bind:value={newDisplayOrder}
				title="Optional. Order for sorting (lower shows first)."
			/>
			<TextArea
				placeholder="Description"
				bind:value={newDescription}
				rows={2}
				title="Optional. Summary of responsibilities/impact."
			/>
		</FieldsWrap>
		<CardActions>
			<Button
				onclick={handleCreate}
				disabled={creating ||
					newTitle.trim().length === 0 ||
					newCompany.trim().length === 0 ||
					newStart.trim().length === 0}
			>
				{creating ? 'Adding…' : 'Add work experience'}
			</Button>
		</CardActions>
	</Card>

	<SectionMessage
		{error}
		{loading}
		empty={!loading && drafts.length === 0}
		emptyText="No work experiences yet."
	>
		{#each drafts as d (d.id)}
			<Card>
				<FieldsWrap>
					<TextInput bind:value={d.job_title} title="Job title/role." />
					<TextInput bind:value={d.company_name} title="Company/organization." />
					<TextInput type="date" bind:value={d.start_date} title="Start date." />
					<TextInput type="date" bind:value={d.end_date} title="Optional. End date." />
					<TextInput
						small
						type="number"
						placeholder="#"
						bind:value={d.display_order}
						title="Optional. Order for sorting (lower shows first)."
					/>
					<TextArea bind:value={d.description} rows={2} title="Optional. Description/details." />
				</FieldsWrap>
				<CardActions>
					{#if isWorkDirty(d)}
						<Button onclick={() => handleSave(d)}>Save</Button>
					{/if}
					<Button variant="danger" onclick={() => handleDelete(d.id)}>Delete</Button>
				</CardActions>

				<FieldsWrap>
					<TextInput
						placeholder="Add key point"
						title="Add a bullet point for this work experience."
						value={newKeyPointText[d.id] ?? ''}
						oninput={(e) =>
							(newKeyPointText = {
								...newKeyPointText,
								[d.id]: (e.target as HTMLInputElement).value
							})}
					/>
					<Button
						onclick={() => handleAddKeyPoint(d.id)}
						disabled={(newKeyPointText[d.id] ?? '').trim().length === 0}
						title="Add key point"
					>
						Add
					</Button>
				</FieldsWrap>

				<NestedList
					title="Key points"
					loading={keyPointLoading[d.id] ?? false}
					empty={(keyPoints[d.id] ?? []).length === 0}
					emptyText="No key points."
				>
					{#each keyPoints[d.id] ?? [] as kp (kp.id)}
						<FieldsWrap>
							<TextInput bind:value={kp.key_point} title="Key point text." />
							<TextInput
								small
								type="number"
								placeholder="#"
								bind:value={kp.display_order}
								title="Optional. Order for sorting (lower shows first)."
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
			</Card>
		{/each}
	</SectionMessage>
</SectionShell>
