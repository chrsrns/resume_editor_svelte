<script lang="ts">
	import { onMount } from 'svelte';
	import SectionShell from '$lib/components/sections/SectionShell.svelte';
	import Card from '$lib/components/sections/shared/Card.svelte';
	import DragHandle from '$lib/components/sections/shared/DragHandle.svelte';
	import {
		byDisplayOrder,
		createCardDragReorder,
		createDisplayOrderReorder
	} from '$lib/components/sections/shared/displayOrderReorder';
	import FieldsWrap from '$lib/components/sections/shared/FieldsWrap.svelte';
	import NestedList from '$lib/components/sections/shared/NestedList.svelte';
	import SectionMessage from '$lib/components/sections/shared/SectionMessage.svelte';
	import { createSkill, deleteSkill, listSkills, updateSkill } from '$lib/api/skills';
	import Button from '$lib/components/ui/Button.svelte';
	import TextInput from '$lib/components/ui/TextInput.svelte';
	import type { ApiError } from '$lib/api/client';
	import type { NewSkillRequest, Skill, UpdateSkillRequest } from '$lib/types';

	let { resumeId } = $props<{ resumeId: number }>();

	type SkillDraft = {
		id: number;
		skill_name: string;
		confidence_percentage: string;
		display_order: string;
	};

	let loading = $state(true);
	let error = $state<string | null>(null);
	let drafts = $state<SkillDraft[]>([]);
	let savedSigById = $state<Record<number, string>>({});
	let draggingId = $state<number | null>(null);
	let dragOverId = $state<number | null>(null);
	let reordering = $state(false);

	let newSkillName = $state('');
	let newConfidence = $state('80');
	let creating = $state(false);

	const displayOrderReorder = createDisplayOrderReorder<SkillDraft>({
		getDrafts: () => drafts,
		setDrafts: (next) => (drafts = next),
		getSavedSigs: () => savedSigById,
		setSavedSigs: (next) => (savedSigById = next),
		getReordering: () => reordering,
		setReordering: (next) => (reordering = next),
		setError: (message) => (error = message),
		getErrorMessage: (e) => (e as ApiError).message,
		parseOrder: toNumberOrNull,
		updateDisplayOrder: (id, display_order) => updateSkill(id, { display_order }),
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

	function toDraft(s: Skill): SkillDraft {
		return {
			id: s.id,
			skill_name: s.skill_name,
			confidence_percentage: String(s.confidence_percentage),
			display_order: s.display_order == null ? '' : String(s.display_order)
		};
	}

	function sig(d: SkillDraft): string {
		return JSON.stringify({
			skill_name: d.skill_name.trim(),
			confidence_percentage: Number(d.confidence_percentage),
			display_order: toNumberOrNull(d.display_order)
		});
	}

	function isDirty(d: SkillDraft): boolean {
		return savedSigById[d.id] !== sig(d);
	}

	async function refresh() {
		loading = true;
		error = null;
		try {
			const items = await listSkills(resumeId);
			const sorted = [...items].sort(byDisplayOrder);
			const ds = sorted.map(toDraft);
			drafts = ds;
			savedSigById = Object.fromEntries(ds.map((d) => [d.id, sig(d)]));
		} catch (e) {
			const err = e as ApiError;
			error = err.message;
		} finally {
			loading = false;
		}
	}

	function toNumberOrNull(value: string): number | null {
		const t = value.trim();
		if (t.length === 0) return null;
		const n = Number(t);
		return Number.isFinite(n) ? n : null;
	}

	onMount(() => {
		void refresh();
	});

	async function handleCreate() {
		creating = true;
		error = null;
		try {
			const payload: NewSkillRequest = {
				skill_name: newSkillName.trim(),
				confidence_percentage: Number(newConfidence),
				display_order: null
			};
			await createSkill(resumeId, payload);
			newSkillName = '';
			newConfidence = '80';
			await refresh();
		} catch (e) {
			const err = e as ApiError;
			error = err.message;
		} finally {
			creating = false;
		}
	}

	async function handleSave(d: SkillDraft) {
		error = null;
		try {
			const payload: UpdateSkillRequest = {
				skill_name: d.skill_name.trim(),
				confidence_percentage: Number(d.confidence_percentage),
				display_order: toNumberOrNull(d.display_order)
			};
			await updateSkill(d.id, payload);
			await refresh();
		} catch (e) {
			const err = e as ApiError;
			error = err.message;
		}
	}

	async function handleDelete(id: number) {
		const ok = confirm('Delete this skill?');
		if (!ok) return;
		error = null;
		try {
			await deleteSkill(id);
			await refresh();
		} catch (e) {
			const err = e as ApiError;
			error = err.message;
		}
	}
</script>

<SectionShell title="Skills" description="Editable list of skills for this resume.">
	<Card variant="new">
		<FieldsWrap>
			<TextInput
				label="Skill name"
				bind:value={newSkillName}
				title="Name of the skill (e.g. Rust, SQL, Communication)."
				onkeydown={(e) => {
					if (e.key === 'Enter' && newSkillName.trim().length > 0) {
						handleCreate();
					}
				}}
			/>
			<TextInput
				label="Confidence"
				small
				type="number"
				min={0}
				max={100}
				step={1}
				bind:value={newConfidence}
				title="Confidence level (0–100)."
				onkeydown={(e) => {
					if (e.key === 'Enter' && newSkillName.trim().length > 0) {
						handleCreate();
					}
				}}
			/>
			<Button onclick={handleCreate} disabled={creating || newSkillName.trim().length === 0}>
				{creating ? 'Adding…' : 'Add'}
			</Button>
		</FieldsWrap>
	</Card>

	<SectionMessage {error} {loading} empty={false}>
		<NestedList
			title="Skills"
			loading={false}
			empty={drafts.length === 0}
			emptyText="No skills yet."
		>
			{#each drafts as d (d.id)}
				<FieldsWrap
					role="group"
					aria-label="Skill"
					class={draggingId != null && dragOverId === d.id && draggingId !== d.id ? 'dropOver' : ''}
					ondragover={(e) => dragReorder.handleDragOver(d.id, e)}
					ondrop={(e) => dragReorder.handleDrop(d.id, e)}
				>
					<DragHandle
						ondragstart={(e) => dragReorder.handleDragStart(d.id, e)}
						ondragend={() => dragReorder.handleDragEnd()}
						onkeydown={(e) => dragReorder.handleHandleKeydown(d.id, e)}
						disabled={loading || reordering}
						dragging={draggingId === d.id}
						label="Reorder skill"
					/>
					<TextInput
						label="Skill name"
						bind:value={d.skill_name}
						title="Skill name."
						onkeydown={(e) => {
							if (e.key === 'Enter' && d.skill_name.trim().length > 0) {
								handleSave(d);
							}
						}}
					/>
					<TextInput
						label="Confidence"
						small
						type="number"
						min={0}
						max={100}
						step={1}
						bind:value={d.confidence_percentage}
						title="Confidence level (0–100)."
						onkeydown={(e) => {
							if (e.key === 'Enter' && d.skill_name.trim().length > 0) {
								handleSave(d);
							}
						}}
					/>
					{#if isDirty(d)}
						<Button onclick={() => handleSave(d)}>Save</Button>
					{/if}
					<Button variant="danger" onclick={() => handleDelete(d.id)}>Delete</Button>
				</FieldsWrap>
			{/each}
		</NestedList>
	</SectionMessage>
</SectionShell>
