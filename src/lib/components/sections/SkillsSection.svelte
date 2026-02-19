<script lang="ts">
	import { onMount } from 'svelte';
	import SectionShell from '$lib/components/sections/SectionShell.svelte';
	import { createSkill, deleteSkill, listSkills, updateSkill } from '$lib/api/skills';
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

	let newSkillName = $state('');
	let newConfidence = $state('80');
	let newDisplayOrder = $state('');
	let creating = $state(false);

	function toDraft(s: Skill): SkillDraft {
		return {
			id: s.id,
			skill_name: s.skill_name,
			confidence_percentage: String(s.confidence_percentage),
			display_order: s.display_order == null ? '' : String(s.display_order)
		};
	}

	async function refresh() {
		loading = true;
		error = null;
		try {
			const items = await listSkills(resumeId);
			drafts = items.map(toDraft);
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
				display_order: toNumberOrNull(newDisplayOrder)
			};
			await createSkill(resumeId, payload);
			newSkillName = '';
			newConfidence = '80';
			newDisplayOrder = '';
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
	{#if error}
		<p class="error">{error}</p>
	{/if}

	<div class="newRow">
		<input
			class="input"
			placeholder="Skill name"
			bind:value={newSkillName}
			title="Name of the skill (e.g. Rust, SQL, Communication)."
		/>
		<input
			class="input small"
			type="number"
			min="0"
			max="100"
			step="1"
			bind:value={newConfidence}
			title="Confidence level (0–100)."
		/>
		<input
			class="input small"
			type="number"
			placeholder="#"
			bind:value={newDisplayOrder}
			title="Optional. Order for sorting (lower shows first)."
		/>
		<button
			class="button"
			type="button"
			onclick={handleCreate}
			disabled={creating || newSkillName.trim().length === 0}
		>
			{creating ? 'Adding…' : 'Add'}
		</button>
	</div>

	{#if loading}
		<p>Loading…</p>
	{:else if drafts.length === 0}
		<p class="muted">No skills yet.</p>
	{:else}
		<div class="grid">
			{#each drafts as d (d.id)}
				<div class="card">
					<div class="row">
						<input class="input" bind:value={d.skill_name} title="Skill name." />
						<input
							class="input small"
							type="number"
							min="0"
							max="100"
							step="1"
							bind:value={d.confidence_percentage}
							title="Confidence level (0–100)."
						/>
						<input
							class="input small"
							type="number"
							placeholder="#"
							bind:value={d.display_order}
							title="Optional. Order for sorting (lower shows first)."
						/>
					</div>
					<div class="actions">
						<button class="button" type="button" onclick={() => handleSave(d)}>Save</button>
						<button class="button danger" type="button" onclick={() => handleDelete(d.id)}
							>Delete</button
						>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</SectionShell>

<style>
	.grid {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.card {
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		padding: 12px;
		background: #f8fafc;
	}

	.newRow,
	.row {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		align-items: center;
	}

	.newRow .input:not(.small),
	.row .input:not(.small) {
		flex: 1 1 240px;
		min-width: 180px;
	}

	.newRow .input.small,
	.row .input.small {
		flex: 0 1 110px;
		min-width: 90px;
	}

	.newRow .button {
		flex: 0 0 auto;
	}

	.actions {
		margin-top: 10px;
		display: flex;
		gap: 10px;
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
