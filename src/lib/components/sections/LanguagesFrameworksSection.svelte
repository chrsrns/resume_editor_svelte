<script lang="ts">
	import { onMount } from 'svelte';
	import SectionShell from '$lib/components/sections/SectionShell.svelte';
	import Card from '$lib/components/sections/shared/Card.svelte';
	import FieldsWrap from '$lib/components/sections/shared/FieldsWrap.svelte';
	import NestedList from '$lib/components/sections/shared/NestedList.svelte';
	import SectionMessage from '$lib/components/sections/shared/SectionMessage.svelte';
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
	import Button from '$lib/components/ui/Button.svelte';
	import TextInput from '$lib/components/ui/TextInput.svelte';

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
	<Card variant="new">
		<FieldsWrap>
			<TextInput
				placeholder="Language"
				bind:value={newLanguageName}
				title="Programming language name (e.g. TypeScript, Rust)."
			/>
			<TextInput
				small
				type="number"
				placeholder="#"
				bind:value={newLanguageOrder}
				title="Optional. Order for sorting (lower shows first)."
			/>
			<Button
				onclick={handleCreateLanguage}
				disabled={creatingLanguage || newLanguageName.trim().length === 0}
			>
				{creatingLanguage ? 'Adding…' : 'Add language'}
			</Button>
		</FieldsWrap>
	</Card>

	<SectionMessage
		{error}
		{loading}
		empty={!loading && languages.length === 0}
		emptyText="No languages yet."
	>
		{#each languages as l (l.id)}
			<Card>
				<FieldsWrap>
					<TextInput bind:value={l.language_name} title="Language name." />
					<TextInput
						small
						type="number"
						placeholder="#"
						bind:value={l.display_order}
						title="Optional. Order for sorting (lower shows first)."
					/>
				</FieldsWrap>
				<div style="margin-top: 10px; display: flex; flex-wrap: wrap; gap: 10px;">
					<Button onclick={() => handleSaveLanguage(l)}>Save</Button>
					<Button variant="danger" onclick={() => handleDeleteLanguage(l.id)}>Delete</Button>
				</div>

				<FieldsWrap>
					<TextInput
						placeholder="Add framework"
						title="Add a framework/library for this language (e.g. Svelte, Rocket)."
						value={newFrameworkText[l.id] ?? ''}
						oninput={(e) =>
							(newFrameworkText = {
								...newFrameworkText,
								[l.id]: (e.target as HTMLInputElement).value
							})}
					/>
					<Button
						onclick={() => handleCreateFramework(l.id)}
						disabled={(newFrameworkText[l.id] ?? '').trim().length === 0}
					>
						Add
					</Button>
				</FieldsWrap>

				<NestedList
					title="Frameworks"
					loading={frameworksLoading[l.id] ?? false}
					empty={(frameworks[l.id] ?? []).length === 0}
					emptyText="No frameworks."
				>
					{#each frameworks[l.id] ?? [] as f (f.id)}
						<FieldsWrap>
							<TextInput bind:value={f.framework_name} title="Framework/library name." />
							<TextInput
								small
								type="number"
								placeholder="#"
								bind:value={f.display_order}
								title="Optional. Order for sorting (lower shows first)."
							/>
							<Button onclick={() => handleSaveFramework(l.id, f)}>Save</Button>
							<Button variant="danger" onclick={() => handleDeleteFramework(l.id, f.id)}>
								Delete
							</Button>
						</FieldsWrap>
					{/each}
				</NestedList>
			</Card>
		{/each}
	</SectionMessage>
</SectionShell>
