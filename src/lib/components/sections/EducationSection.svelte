<script lang="ts">
	import { onMount } from 'svelte';
	import SectionShell from '$lib/components/sections/SectionShell.svelte';
	import Card from '$lib/components/sections/shared/Card.svelte';
	import CardActions from '$lib/components/sections/shared/CardActions.svelte';
	import FieldsWrap from '$lib/components/sections/shared/FieldsWrap.svelte';
	import NestedList from '$lib/components/sections/shared/NestedList.svelte';
	import SectionMessage from '$lib/components/sections/shared/SectionMessage.svelte';
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
	import Button from '$lib/components/ui/Button.svelte';
	import TextArea from '$lib/components/ui/TextArea.svelte';
	import TextInput from '$lib/components/ui/TextInput.svelte';

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
	let savedEduSigById = $state<Record<number, string>>({});
	let keyPoints = $state<Record<number, KeyPointDraft[]>>({});
	let keyPointLoading = $state<Record<number, boolean>>({});
	let savedKeyPointSigById = $state<Record<number, string>>({});

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

	function sigEdu(d: EducationDraft): string {
		return JSON.stringify({
			education_stage: d.education_stage.trim(),
			institution_name: d.institution_name.trim(),
			degree: toNullable(d.degree),
			start_date: d.start_date,
			end_date: toNullable(d.end_date),
			description: toNullable(d.description),
			display_order: toNumberOrNull(d.display_order)
		});
	}

	function isEduDirty(d: EducationDraft): boolean {
		return savedEduSigById[d.id] !== sigEdu(d);
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
			const items = await listEducations(resumeId);
			const ds = items.map(toDraft);
			drafts = ds;
			savedEduSigById = Object.fromEntries(ds.map((d) => [d.id, sigEdu(d)]));
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
			const ds = points.map(toKeyPointDraft);
			keyPoints = { ...keyPoints, [educationId]: ds };
			savedKeyPointSigById = {
				...savedKeyPointSigById,
				...Object.fromEntries(ds.map((d) => [d.id, sigKeyPoint(d)]))
			};
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
	<Card variant="new">
		<FieldsWrap>
			<TextInput
				placeholder="Stage (e.g. Bachelor)"
				bind:value={newStage}
				title="Education stage/level (e.g. High School, Diploma, Bachelor, Master)."
			/>
			<TextInput
				placeholder="Institution"
				bind:value={newInstitution}
				title="School/university/training provider name."
			/>
			<TextInput
				placeholder="Degree"
				bind:value={newDegree}
				title="Optional. Degree/qualification name."
			/>
			<TextInput type="date" bind:value={newStart} title="Start date for this education." />
			<TextInput
				type="date"
				bind:value={newEnd}
				title="Optional. End date (leave blank if ongoing)."
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
				title="Optional. Additional details about the education."
			/>
		</FieldsWrap>
		<CardActions>
			<Button
				onclick={handleCreate}
				disabled={creating ||
					newStage.trim().length === 0 ||
					newInstitution.trim().length === 0 ||
					newStart.trim().length === 0}
			>
				{creating ? 'Adding…' : 'Add education'}
			</Button>
		</CardActions>
	</Card>

	<SectionMessage
		{error}
		{loading}
		empty={!loading && drafts.length === 0}
		emptyText="No education entries yet."
	>
		{#each drafts as d (d.id)}
			<Card>
				<FieldsWrap>
					<TextInput bind:value={d.education_stage} title="Education stage/level." />
					<TextInput bind:value={d.institution_name} title="Institution name." />
					<TextInput
						placeholder="Degree"
						bind:value={d.degree}
						title="Optional. Degree/qualification name."
					/>
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
					{#if isEduDirty(d)}
						<Button onclick={() => handleSave(d)}>Save</Button>
					{/if}
					<Button variant="danger" onclick={() => handleDelete(d.id)}>Delete</Button>
				</CardActions>

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

				<FieldsWrap>
					<TextInput
						placeholder="Add key point"
						title="Add a bullet point for this education entry."
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
					>
						Add
					</Button>
				</FieldsWrap>
			</Card>
		{/each}
	</SectionMessage>
</SectionShell>
