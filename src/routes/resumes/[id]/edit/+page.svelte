<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
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

	let resume = $state<Resume | null>(null);
	let loading = $state(true);
	let saving = $state(false);
	let deleting = $state(false);
	let error = $state<string | null>(null);

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
			void goto('/auth/login');
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
			await goto(`/resumes/${updated.id}`);
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
			await goto('/resumes');
		} catch (e) {
			const err = e as ApiError;
			error = err.message;
		} finally {
			deleting = false;
		}
	}
</script>

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
			<a class="button secondary" href={`/resumes/${resume.id}`}>Cancel</a>
			<button class="button danger" type="button" onclick={handleDelete} disabled={deleting}>
				{deleting ? 'Deleting…' : 'Delete'}
			</button>
		</div>
	</div>

	{#if $currentUser && resume.created_by !== $currentUser.id}
		<p class="error">Forbidden</p>
	{:else}
		<ResumeForm
			initial={resume}
			submitLabel={saving ? 'Saving…' : 'Save'}
			onsubmit={handleSubmit}
		/>

		<EducationSection resumeId={resume.id} />
		<WorkExperiencesSection resumeId={resume.id} />
		<PortfolioProjectsSection resumeId={resume.id} />
		<SkillsSection resumeId={resume.id} />
		<LanguagesFrameworksSection resumeId={resume.id} />
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
</style>
