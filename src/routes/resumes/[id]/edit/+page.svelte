<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { base } from '$app/paths';
	import { deleteResume, getResume, updateResume } from '$lib/api/resumes';
	import type { ApiError } from '$lib/api/client';
	import ResumeForm from '$lib/components/ResumeForm.svelte';
	import EducationSection from '$lib/components/sections/EducationSection.svelte';
	import LanguagesFrameworksSection from '$lib/components/sections/LanguagesFrameworksSection.svelte';
	import PortfolioProjectsSection from '$lib/components/sections/PortfolioProjectsSection.svelte';
	import SkillsSection from '$lib/components/sections/SkillsSection.svelte';
	import WorkExperiencesSection from '$lib/components/sections/WorkExperiencesSection.svelte';
	import type { Resume, UpdateResumeRequest } from '$lib/types';
	import { authToken } from '$lib/auth';
	import { currentUser } from '$lib/session';

	const tabs = [
		{ id: 'basics', label: 'Basics' },
		{ id: 'education', label: 'Education' },
		{ id: 'work', label: 'Work' },
		{ id: 'portfolio', label: 'Portfolio' },
		{ id: 'skills', label: 'Skills' },
		{ id: 'languages', label: 'Languages & Frameworks' }
	] as const;

	type TabId = (typeof tabs)[number]['id'];

	function parseTabId(value: string | null): TabId {
		const v = value ?? '';
		const found = tabs.find((t) => t.id === v);
		return found ? found.id : 'basics';
	}

	let resume = $state<Resume | null>(null);
	let loading = $state(true);
	let saving = $state(false);
	let deleting = $state(false);
	let error = $state<string | null>(null);
	let activeTab = $state<TabId>('basics');

	function onTabListKeydown(e: KeyboardEvent) {
		const tablist = e.currentTarget as HTMLElement | null;
		if (!tablist) return;

		const buttons = Array.from(tablist.querySelectorAll<HTMLButtonElement>('button[role="tab"]'));
		if (buttons.length === 0) return;

		const focusedIndex = buttons.findIndex((b) => b === document.activeElement);
		const activeIndex = Math.max(
			0,
			tabs.findIndex((t) => t.id === activeTab)
		);
		const idx = focusedIndex >= 0 ? focusedIndex : activeIndex;

		function focusAt(nextIndex: number) {
			const count = buttons.length;
			const next = ((nextIndex % count) + count) % count;
			buttons[next]?.focus();
		}

		switch (e.key) {
			case 'ArrowLeft':
				e.preventDefault();
				focusAt(idx - 1);
				break;
			case 'ArrowRight':
				e.preventDefault();
				focusAt(idx + 1);
				break;
			case 'Home':
				e.preventDefault();
				focusAt(0);
				break;
			case 'End':
				e.preventDefault();
				focusAt(buttons.length - 1);
				break;
			case 'Enter':
			case ' ': {
				e.preventDefault();
				const el = document.activeElement as HTMLButtonElement | null;
				const raw = el?.dataset.tab ?? null;
				selectTab(parseTabId(raw));
				break;
			}
		}
	}

	function selectTab(id: TabId) {
		const params = new URLSearchParams(page.url.searchParams);
		params.set('tab', id);
		void goto(`${page.url.pathname}?${params.toString()}`, {
			replaceState: false,
			noScroll: true,
			keepFocus: true
		});
	}

	$effect(() => {
		activeTab = parseTabId(page.url.searchParams.get('tab'));
	});

	async function load() {
		loading = true;
		error = null;
		try {
			const id = Number(page.params.id);
			resume = await getResume(id);
		} catch (e) {
			const err = e as ApiError;
			error = err.message;
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		if (!$authToken) {
			void goto(`${base}/auth/login`);
			return;
		}
		void load();
	});

	async function handleSubmit(payload: UpdateResumeRequest & { is_public: boolean }) {
		if (!resume) return;
		error = null;
		saving = true;
		try {
			const updated = await updateResume(resume.id, payload);
			await goto(`${base}/resumes/${updated.id}`);
		} catch (e) {
			const err = e as ApiError;
			error = err.message;
		} finally {
			saving = false;
		}
	}

	async function handleDelete() {
		if (!resume) return;
		const confirmed = confirm('Delete this resume?');
		if (!confirmed) return;

		error = null;
		deleting = true;
		try {
			await deleteResume(resume.id);
			await goto(`${base}/resumes`);
		} catch (e) {
			const err = e as ApiError;
			error = err.message;
		} finally {
			deleting = false;
		}
	}
</script>

<svelte:head>
	<title>Editing resume of: {resume?.name} - Resume Editor</title>
</svelte:head>

{#if loading}
	<p>Loading…</p>
{:else if error}
	<p class="error">{error}</p>
{:else if resume}
	<div class="header">
		<div>
			<h1>Edit resume</h1>
			<p class="muted">{resume.name}</p>
		</div>
		<div class="actions">
			<a class="button secondary" href={`${base}/resumes/${resume.id}`}>Cancel</a>
			<button class="button danger" type="button" onclick={handleDelete} disabled={deleting}>
				{deleting ? 'Deleting…' : 'Delete'}
			</button>
		</div>
	</div>

	{#if $currentUser && resume.created_by !== $currentUser.id}
		<p class="error">Forbidden</p>
	{:else}
		<div
			class="tabs"
			role="tablist"
			aria-label="Resume sections"
			tabindex="0"
			onkeydown={onTabListKeydown}
		>
			{#each tabs as t, i}
				<button
					class="tab {activeTab === t.id ? 'active' : ''}"
					type="button"
					role="tab"
					aria-selected={activeTab === t.id}
					aria-controls={`panel-${t.id}`}
					id={`tab-${t.id}`}
					tabindex={activeTab === t.id ? 0 : -1}
					onclick={() => selectTab(t.id)}
					data-tab={t.id}
				>
					{t.label}
				</button>
			{/each}
		</div>

		<div
			class="panel"
			hidden={activeTab !== 'basics'}
			role="tabpanel"
			id="panel-basics"
			aria-labelledby="tab-basics"
			tabindex="0"
		>
			<ResumeForm
				initial={resume}
				submitLabel={saving ? 'Saving…' : 'Save'}
				onsubmit={handleSubmit}
			/>
		</div>

		<div
			class="panel"
			hidden={activeTab !== 'education'}
			role="tabpanel"
			id="panel-education"
			aria-labelledby="tab-education"
			tabindex="0"
		>
			<EducationSection resumeId={resume.id} />
		</div>
		<div
			class="panel"
			hidden={activeTab !== 'work'}
			role="tabpanel"
			id="panel-work"
			aria-labelledby="tab-work"
			tabindex="0"
		>
			<WorkExperiencesSection resumeId={resume.id} />
		</div>
		<div
			class="panel"
			hidden={activeTab !== 'portfolio'}
			role="tabpanel"
			id="panel-portfolio"
			aria-labelledby="tab-portfolio"
			tabindex="0"
		>
			<PortfolioProjectsSection resumeId={resume.id} />
		</div>
		<div
			class="panel"
			hidden={activeTab !== 'skills'}
			role="tabpanel"
			id="panel-skills"
			aria-labelledby="tab-skills"
			tabindex="0"
		>
			<SkillsSection resumeId={resume.id} />
		</div>
		<div
			class="panel"
			hidden={activeTab !== 'languages'}
			role="tabpanel"
			id="panel-languages"
			aria-labelledby="tab-languages"
			tabindex="0"
		>
			<LanguagesFrameworksSection resumeId={resume.id} />
		</div>
	{/if}
{/if}

<style>
	.header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
	}

	.actions {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}

	.button {
		padding: 10px 14px;
		border: 1px solid #0f172a;
		border-radius: 8px;
		background: #0f172a;
		color: white;
		text-decoration: none;
		cursor: pointer;
	}

	.button.secondary {
		background: white;
		color: #0f172a;
	}

	.button.danger {
		border-color: #b91c1c;
		background: #b91c1c;
	}

	.button[disabled] {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.error {
		color: #b91c1c;
	}

	.muted {
		color: #475569;
		margin: 0;
	}

	.tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin: 16px 0;
		padding-bottom: 8px;
		border-bottom: 1px solid #e2e8f0;
	}

	.tab {
		padding: 8px 12px;
		border: 1px solid #cbd5e1;
		border-radius: 999px;
		background: white;
		color: #0f172a;
		cursor: pointer;
	}

	.tab.active {
		border-color: #0f172a;
		background: #0f172a;
		color: white;
	}

	.tab:focus {
		outline: 2px solid #2563eb;
		outline-offset: 2px;
	}

	.panel {
		margin-top: 8px;
	}
</style>
