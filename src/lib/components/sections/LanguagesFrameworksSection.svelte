<script lang="ts">
	import { onMount } from 'svelte';
	import SectionShell from '$lib/components/sections/SectionShell.svelte';
	import Card from '$lib/components/sections/shared/Card.svelte';
	import CardActions from '$lib/components/sections/shared/CardActions.svelte';
	import CardWithInner from '$lib/components/sections/shared/CardWithInner.svelte';
	import DragHandle from '$lib/components/sections/shared/DragHandle.svelte';
	import {
		byDisplayOrder,
		createCardDragReorder,
		createDisplayOrderReorder
	} from '$lib/components/sections/shared/displayOrderReorder';
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
	let savedLangSigById = $state<Record<number, string>>({});
	let draggingId = $state<number | null>(null);
	let dragOverId = $state<number | null>(null);
	let reordering = $state(false);

	let frameworks = $state<Record<number, FrameworkDraft[]>>({});
	let frameworksLoading = $state<Record<number, boolean>>({});
	let savedFrameworkSigById = $state<Record<number, string>>({});

	let newLanguageName = $state('');
	let creatingLanguage = $state(false);

	let newFrameworkText = $state<Record<number, string>>({});

	function toNumberOrNull(value: string): number | null {
		const t = value.trim();
		if (t.length === 0) return null;
		const n = Number(t);
		return Number.isFinite(n) ? n : null;
	}

	const displayOrderReorder = createDisplayOrderReorder<LanguageDraft>({
		getDrafts: () => languages,
		setDrafts: (next) => (languages = next),
		getSavedSigs: () => savedLangSigById,
		setSavedSigs: (next) => (savedLangSigById = next),
		getReordering: () => reordering,
		setReordering: (next) => (reordering = next),
		setError: (message) => (error = message),
		getErrorMessage: (e) => (e as ApiError).message,
		parseOrder: toNumberOrNull,
		updateDisplayOrder: (id, display_order) => updateLanguage(id, { display_order }),
		orderStep: 10
	});

	const dragReorder = createCardDragReorder({
		getDraggingId: () => draggingId,
		setDraggingId: (id) => (draggingId = id),
		setDragOverId: (id) => (dragOverId = id),
		getReordering: () => reordering,
		getOrderedIds: () => languages.map((d) => d.id),
		reorderByIds: displayOrderReorder.reorderByIds
	});

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

	function sigLanguage(d: LanguageDraft): string {
		return JSON.stringify({
			language_name: d.language_name.trim(),
			display_order: toNumberOrNull(d.display_order)
		});
	}

	function isLanguageDirty(d: LanguageDraft): boolean {
		return savedLangSigById[d.id] !== sigLanguage(d);
	}

	function sigFramework(d: FrameworkDraft): string {
		return JSON.stringify({
			framework_name: d.framework_name.trim(),
			display_order: toNumberOrNull(d.display_order)
		});
	}

	function isFrameworkDirty(d: FrameworkDraft): boolean {
		return savedFrameworkSigById[d.id] !== sigFramework(d);
	}

	async function refresh() {
		loading = true;
		error = null;
		try {
			const items = await listLanguages(resumeId);
			const sorted = [...items].sort(byDisplayOrder);
			const ds = sorted.map(toLanguageDraft);
			languages = ds;
			savedLangSigById = Object.fromEntries(ds.map((d) => [d.id, sigLanguage(d)]));

			const map: Record<number, FrameworkDraft[]> = {};
			for (const l of sorted) map[l.id] = [];
			frameworks = map;
			for (const l of sorted) void loadFrameworks(l.id);
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
			const ds = items.map(toFrameworkDraft);
			frameworks = { ...frameworks, [languageId]: ds };
			savedFrameworkSigById = {
				...savedFrameworkSigById,
				...Object.fromEntries(ds.map((d) => [d.id, sigFramework(d)]))
			};
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
				display_order: null
			};
			await createLanguage(resumeId, payload);
			newLanguageName = '';
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
				type="text"
				disabled
				value=""
				title="Ordering is controlled by drag and drop."
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
			<CardWithInner
				ariaLabel="Language"
				dropOver={draggingId != null && dragOverId === l.id && draggingId !== l.id}
				ondragover={(e) => dragReorder.handleDragOver(l.id, e)}
				ondrop={(e) => dragReorder.handleDrop(l.id, e)}
			>
				<FieldsWrap>
					<DragHandle
						ondragstart={(e) => dragReorder.handleDragStart(l.id, e)}
						ondragend={() => dragReorder.handleDragEnd()}
						onkeydown={(e) => dragReorder.handleHandleKeydown(l.id, e)}
						disabled={loading || reordering}
						dragging={draggingId === l.id}
						label="Reorder language"
					/>
					<TextInput bind:value={l.language_name} title="Language name." />
				</FieldsWrap>
				<CardActions>
					{#if isLanguageDirty(l)}
						<Button onclick={() => handleSaveLanguage(l)}>Save</Button>
					{/if}
					<Button variant="danger" onclick={() => handleDeleteLanguage(l.id)}>Delete</Button>
				</CardActions>

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
							{#if isFrameworkDirty(f)}
								<Button onclick={() => handleSaveFramework(l.id, f)}>Save</Button>
							{/if}
							<Button variant="danger" onclick={() => handleDeleteFramework(l.id, f.id)}>
								Delete
							</Button>
						</FieldsWrap>
					{/each}
				</NestedList>
			</CardWithInner>
		{/each}
	</SectionMessage>
</SectionShell>
