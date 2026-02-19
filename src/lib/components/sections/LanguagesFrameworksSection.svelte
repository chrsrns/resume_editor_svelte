<script lang="ts">
	import { onMount } from 'svelte';
	import SectionShell from '$lib/components/sections/SectionShell.svelte';
	import {
		createLanguage,
		deleteLanguage,
		listLanguages,
		updateLanguage
	} from '$lib/api/languages';
	import {
		createFramework,
		deleteFramework,
		listFrameworks,
		updateFramework
	} from '$lib/api/frameworks';
	import type { ApiError } from '$lib/api/client';
	import type {
		Framework,
		Language,
		NewFrameworkRequest,
		NewLanguageRequest,
		UpdateFrameworkRequest,
		UpdateLanguageRequest
	} from '$lib/types';

	let { resumeId } = $props<{ resumeId: number }>();

	type LanguageDraft = {
		id: number;
		language_name: string;
		display_order: string;
	};

	type FrameworkDraft = {
		id: number;
		framework_name: string;
		display_order: string;
	};

	let loading = $state(true);
	let error = $state<string | null>(null);
	let languages = $state<LanguageDraft[]>([]);

	let frameworks = $state<Record<number, FrameworkDraft[]>>({});
	let frameworksLoading = $state<Record<number, boolean>>({});

	let newLanguageName = $state('');
	let newLanguageOrder = $state('');
	let creatingLanguage = $state(false);

	let newFrameworkText = $state<Record<number, string>>({});

	function toNumberOrNull(value: string): number | null {
		const t = value.trim();
		if (t.length === 0) return null;
		const n = Number(t);
		return Number.isFinite(n) ? n : null;
	}

	function toLanguageDraft(l: Language): LanguageDraft {
		return {
			id: l.id,
			language_name: l.language_name,
			display_order: l.display_order == null ? '' : String(l.display_order)
		};
	}

	function toFrameworkDraft(f: Framework): FrameworkDraft {
		return {
			id: f.id,
			framework_name: f.framework_name,
			display_order: f.display_order == null ? '' : String(f.display_order)
		};
	}

	async function refresh() {
		loading = true;
		error = null;
		try {
			const items = await listLanguages(resumeId);
			languages = items.map(toLanguageDraft);

			const map: Record<number, FrameworkDraft[]> = {};
			for (const l of items) map[l.id] = [];
			frameworks = map;
			for (const l of items) void loadFrameworks(l.id);
		} catch (e) {
			const err = e as ApiError;
			error = err.message;
		} finally {
			loading = false;
		}
	}

	async function loadFrameworks(languageId: number) {
		frameworksLoading = { ...frameworksLoading, [languageId]: true };
		try {
			const items = await listFrameworks(resumeId, languageId);
			frameworks = { ...frameworks, [languageId]: items.map(toFrameworkDraft) };
		} catch {
			frameworks = { ...frameworks, [languageId]: [] };
		} finally {
			frameworksLoading = { ...frameworksLoading, [languageId]: false };
		}
	}

	onMount(() => {
		void refresh();
	});

	async function handleCreateLanguage() {
		creatingLanguage = true;
		error = null;
		try {
			const payload: NewLanguageRequest = {
				language_name: newLanguageName.trim(),
				display_order: toNumberOrNull(newLanguageOrder)
			};
			await createLanguage(resumeId, payload);
			newLanguageName = '';
			newLanguageOrder = '';
			await refresh();
		} catch (e) {
			const err = e as ApiError;
			error = err.message;
		} finally {
			creatingLanguage = false;
		}
	}

	async function handleSaveLanguage(d: LanguageDraft) {
		error = null;
		try {
			const payload: UpdateLanguageRequest = {
				language_name: d.language_name.trim(),
				display_order: toNumberOrNull(d.display_order)
			};
			await updateLanguage(d.id, payload);
			await refresh();
		} catch (e) {
			const err = e as ApiError;
			error = err.message;
		}
	}

	async function handleDeleteLanguage(languageId: number) {
		const ok = confirm('Delete this language?');
		if (!ok) return;
		error = null;
		try {
			await deleteLanguage(languageId);
			await refresh();
		} catch (e) {
			const err = e as ApiError;
			error = err.message;
		}
	}

	async function handleCreateFramework(languageId: number) {
		const text = (newFrameworkText[languageId] ?? '').trim();
		if (text.length === 0) return;
		error = null;
		try {
			const payload: NewFrameworkRequest = {
				framework_name: text,
				display_order: null
			};
			await createFramework(resumeId, languageId, payload);
			newFrameworkText = { ...newFrameworkText, [languageId]: '' };
			await loadFrameworks(languageId);
		} catch (e) {
			const err = e as ApiError;
			error = err.message;
		}
	}

	async function handleSaveFramework(languageId: number, f: FrameworkDraft) {
		error = null;
		try {
			const payload: UpdateFrameworkRequest = {
				framework_name: f.framework_name.trim(),
				display_order: toNumberOrNull(f.display_order)
			};
			await updateFramework(f.id, payload);
			await loadFrameworks(languageId);
		} catch (e) {
			const err = e as ApiError;
			error = err.message;
		}
	}

	async function handleDeleteFramework(languageId: number, frameworkId: number) {
		const ok = confirm('Delete this framework?');
		if (!ok) return;
		error = null;
		try {
			await deleteFramework(frameworkId);
			await loadFrameworks(languageId);
		} catch (e) {
			const err = e as ApiError;
			error = err.message;
		}
	}
</script>

<SectionShell title="Languages & frameworks" description="Languages with nested frameworks.">
	{#if error}
		<p class="error">{error}</p>
	{/if}

	<div class="newRow">
		<input
			class="input"
			placeholder="Language"
			bind:value={newLanguageName}
			title="Programming language name (e.g. TypeScript, Rust)."
		/>
		<input
			class="input small"
			type="number"
			placeholder="#"
			bind:value={newLanguageOrder}
			title="Optional. Order for sorting (lower shows first)."
		/>
		<button
			class="button"
			type="button"
			onclick={handleCreateLanguage}
			disabled={creatingLanguage || newLanguageName.trim().length === 0}
		>
			{creatingLanguage ? 'Adding…' : 'Add language'}
		</button>
	</div>

	{#if loading}
		<p>Loading…</p>
	{:else if languages.length === 0}
		<p class="muted">No languages yet.</p>
	{:else}
		<div class="list">
			{#each languages as l (l.id)}
				<div class="card">
					<div class="row">
						<input class="input" bind:value={l.language_name} title="Language name." />
						<input
							class="input small"
							type="number"
							placeholder="#"
							bind:value={l.display_order}
							title="Optional. Order for sorting (lower shows first)."
						/>
						<button class="button" type="button" onclick={() => handleSaveLanguage(l)}>Save</button>
						<button class="button danger" type="button" onclick={() => handleDeleteLanguage(l.id)}>
							Delete
						</button>
					</div>

					<div class="nested">
						<div class="nestedHead">
							<strong>Frameworks</strong>
							{#if frameworksLoading[l.id]}
								<span class="muted">Loading…</span>
							{/if}
						</div>

						<div class="addFramework">
							<input
								class="input"
								placeholder="Add framework"
								title="Add a framework/library for this language (e.g. Svelte, Rocket)."
								value={newFrameworkText[l.id] ?? ''}
								oninput={(e) =>
									(newFrameworkText = {
										...newFrameworkText,
										[l.id]: (e.target as HTMLInputElement).value
									})}
							/>
							<button class="button" type="button" onclick={() => handleCreateFramework(l.id)}>
								Add
							</button>
						</div>

						{#if (frameworks[l.id] ?? []).length === 0}
							<p class="muted">No frameworks.</p>
						{:else}
							{#each frameworks[l.id] ?? [] as f (f.id)}
								<div class="frameworkRow">
									<input
										class="input"
										bind:value={f.framework_name}
										title="Framework/library name."
									/>
									<input
										class="input small"
										type="number"
										placeholder="#"
										bind:value={f.display_order}
										title="Optional. Order for sorting (lower shows first)."
									/>
									<button class="button" type="button" onclick={() => handleSaveFramework(l.id, f)}>
										Save
									</button>
									<button
										class="button danger"
										type="button"
										onclick={() => handleDeleteFramework(l.id, f.id)}
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
	.newRow {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		align-items: center;
	}

	.newRow .input:not(.small) {
		flex: 1 1 240px;
		min-width: 180px;
	}

	.newRow .input.small {
		flex: 0 1 90px;
		min-width: 80px;
	}

	.list {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.card {
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		padding: 12px;
		background: #f8fafc;
	}

	.row {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		align-items: center;
	}

	.row .input:not(.small) {
		flex: 1 1 240px;
		min-width: 180px;
	}

	.row .input.small {
		flex: 0 1 90px;
		min-width: 80px;
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

	.addFramework {
		margin-top: 10px;
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		align-items: center;
	}

	.addFramework .input {
		flex: 1 1 260px;
		min-width: 180px;
	}

	.frameworkRow {
		margin-top: 8px;
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		align-items: center;
	}

	.frameworkRow .input:not(.small) {
		flex: 1 1 260px;
		min-width: 180px;
	}

	.frameworkRow .input.small {
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
