<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { listEducations, listEducationKeyPoints } from '$lib/api/education';
	import { listFrameworks } from '$lib/api/frameworks';
	import { listLanguages } from '$lib/api/languages';
	import {
		listPortfolioKeyPoints,
		listPortfolioProjects,
		listPortfolioTechnologies
	} from '$lib/api/portfolio';
	import { getResume } from '$lib/api/resumes';
	import { listSkills } from '$lib/api/skills';
	import { listWorkExperienceKeyPoints, listWorkExperiences } from '$lib/api/work-experience';
	import type { ApiError } from '$lib/api/client';
	import type {
		Education,
		EducationKeyPoint,
		Framework,
		Language,
		PortfolioKeyPoint,
		PortfolioProject,
		PortfolioTechnology,
		Resume,
		Skill,
		WorkExperience,
		WorkExperienceKeyPoint
	} from '$lib/types';
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

	function byDisplayOrder<T extends { display_order: number | null }>(a: T, b: T): number {
		const ao = a.display_order ?? Number.MAX_SAFE_INTEGER;
		const bo = b.display_order ?? Number.MAX_SAFE_INTEGER;
		if (ao !== bo) return ao - bo;
		return 0;
	}

	let loading = $state(true);
	let error = $state<string | null>(null);
	let sectionError = $state<string | null>(null);
	let resume = $state<Resume | null>(null);
	const activeTab = $derived(parseTabId(page.url.searchParams.get('tab')));

	let educations = $state<Education[]>([]);
	let educationKeyPoints = $state<Record<number, EducationKeyPoint[]>>({});
	let workExperiences = $state<WorkExperience[]>([]);
	let workExperienceKeyPoints = $state<Record<number, WorkExperienceKeyPoint[]>>({});
	let portfolioProjects = $state<PortfolioProject[]>([]);
	let portfolioKeyPoints = $state<Record<number, PortfolioKeyPoint[]>>({});
	let portfolioTechnologies = $state<Record<number, PortfolioTechnology[]>>({});
	let skills = $state<Skill[]>([]);
	let languages = $state<Language[]>([]);
	let frameworks = $state<Record<number, Framework[]>>({});

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
		const params = new SvelteURLSearchParams(page.url.searchParams);
		params.set('tab', id);
		void goto(resolve(`/resumes/${page.params.id}?${params.toString()}`), {
			replaceState: false,
			noScroll: true,
			keepFocus: true
		});
	}

	async function loadSections(id: number) {
		const [educationItems, workItems, portfolioItems, skillItems, languageItems] =
			await Promise.all([
				listEducations(id),
				listWorkExperiences(id),
				listPortfolioProjects(id),
				listSkills(id),
				listLanguages(id)
			]);

		educations = [...educationItems].sort(byDisplayOrder);
		workExperiences = [...workItems].sort(byDisplayOrder);
		portfolioProjects = [...portfolioItems].sort(byDisplayOrder);
		skills = [...skillItems].sort(byDisplayOrder);
		languages = [...languageItems].sort(byDisplayOrder);

		educationKeyPoints = Object.fromEntries(
			await Promise.all(
				educations.map(async (education) => [
					education.id,
					(await listEducationKeyPoints(id, education.id)).sort(byDisplayOrder)
				])
			)
		);

		workExperienceKeyPoints = Object.fromEntries(
			await Promise.all(
				workExperiences.map(async (workExperience) => [
					workExperience.id,
					(await listWorkExperienceKeyPoints(id, workExperience.id)).sort(byDisplayOrder)
				])
			)
		);

		portfolioKeyPoints = Object.fromEntries(
			await Promise.all(
				portfolioProjects.map(async (project) => [
					project.id,
					(await listPortfolioKeyPoints(id, project.id)).sort(byDisplayOrder)
				])
			)
		);

		portfolioTechnologies = Object.fromEntries(
			await Promise.all(
				portfolioProjects.map(async (project) => [
					project.id,
					(await listPortfolioTechnologies(id, project.id)).sort(byDisplayOrder)
				])
			)
		);

		frameworks = Object.fromEntries(
			await Promise.all(
				languages.map(async (language) => [
					language.id,
					(await listFrameworks(id, language.id)).sort(byDisplayOrder)
				])
			)
		);
	}

	async function load() {
		loading = true;
		error = null;
		sectionError = null;
		try {
			const id = Number(page.params.id);
			resume = await getResume(id);
			try {
				await loadSections(id);
			} catch (e) {
				const err = e as ApiError;
				sectionError = err.message;
			}
		} catch (e) {
			const err = e as ApiError;
			error = err.message;
		} finally {
			loading = false;
		}
	}

	function formatDateRange(start: string, end: string | null): string {
		return `${start} - ${end && end.trim().length > 0 ? end : 'Present'}`;
	}

	onMount(() => {
		void load();
	});
</script>

<svelte:head>
	<title>{resume?.name} - Resume Editor</title>
</svelte:head>

{#if loading}
	<p>Loading…</p>
{:else if error}
	<p class="error">{error}</p>
{:else if resume}
	<div class="header">
		<div>
			<h1>{resume.name}</h1>
		</div>
		<div class="actions">
			{#if $currentUser && resume.created_by === $currentUser.id}
				<a class="button" href={resolve(`/resumes/${resume.id}/edit`)}>Edit</a>
			{/if}
			<a class="button secondary" href={resolve('/resumes')}>Back</a>
		</div>
	</div>

	<div class="grid">
		{#if resume.profile_image_url}
			<div class="profile-image">
				<img src={resume.profile_image_url} alt={`Profile of ${resume.name}`} />
			</div>
		{/if}

		<div class="content">
			<div
				class="tabs"
				role="tablist"
				aria-label="Resume sections"
				tabindex="0"
				onkeydown={onTabListKeydown}
			>
				{#each tabs as t (t.id)}
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

			{#if sectionError}
				<p class="error section-error">{sectionError}</p>
			{/if}

			<div
				class="panel"
				hidden={activeTab !== 'basics'}
				role="tabpanel"
				id="panel-basics"
				aria-labelledby="tab-basics"
				tabindex="0"
			>
				<div class="card">
					<div class="row">
						<span class="k">Visibility</span><span class="v"
							>{resume.is_public ? 'Public' : 'Private'}</span
						>
					</div>
					<div class="row">
						<span class="k">Email</span><span class="v">{resume.email}</span>
					</div>
					<div class="row">
						<span class="k">Profile image URL</span>
						<span class="v">
							{#if resume.profile_image_url}
								<a class="link" href={resume.profile_image_url} target="_blank" rel="external">
									{resume.profile_image_url}
								</a>
							{:else}
								-
							{/if}
						</span>
					</div>
					<div class="row">
						<span class="k">Location</span><span class="v">{resume.location ?? '-'}</span>
					</div>
					<div class="row">
						<span class="k">GitHub</span>
						<span class="v">
							{#if resume.github_url}
								<a class="link" href={resume.github_url} target="_blank" rel="external">
									{resume.github_url}
								</a>
							{:else}
								-
							{/if}
						</span>
					</div>
					<div class="row">
						<span class="k">Mobile</span><span class="v">{resume.mobile_number ?? '-'}</span>
					</div>
				</div>
			</div>

			<div
				class="panel"
				hidden={activeTab !== 'education'}
				role="tabpanel"
				id="panel-education"
				aria-labelledby="tab-education"
				tabindex="0"
			>
				{#if educations.length === 0}
					<div class="card empty-state">No education entries yet.</div>
				{:else}
					<div class="stack">
						{#each educations as education (education.id)}
							<div class="card section-card">
								<div class="section-head">
									<div>
										<h2>{education.education_stage}</h2>
										<p class="muted">{education.institution_name}</p>
									</div>
									<p class="meta">{formatDateRange(education.start_date, education.end_date)}</p>
								</div>
								{#if education.degree}
									<p>{education.degree}</p>
								{/if}
								{#if education.description}
									<p class="subtle">{education.description}</p>
								{/if}
								{#if (educationKeyPoints[education.id] ?? []).length > 0}
									<ul class="list">
										{#each educationKeyPoints[education.id] ?? [] as keyPoint (keyPoint.id)}
											<li>{keyPoint.key_point}</li>
										{/each}
									</ul>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<div
				class="panel"
				hidden={activeTab !== 'work'}
				role="tabpanel"
				id="panel-work"
				aria-labelledby="tab-work"
				tabindex="0"
			>
				{#if workExperiences.length === 0}
					<div class="card empty-state">No work experience entries yet.</div>
				{:else}
					<div class="stack">
						{#each workExperiences as workExperience (workExperience.id)}
							<div class="card section-card">
								<div class="section-head">
									<div>
										<h2>{workExperience.job_title}</h2>
										<p class="muted">{workExperience.company_name ?? '-'}</p>
									</div>
									<p class="meta">
										{formatDateRange(workExperience.start_date, workExperience.end_date)}
									</p>
								</div>
								{#if workExperience.description}
									<p class="subtle">{workExperience.description}</p>
								{/if}
								{#if (workExperienceKeyPoints[workExperience.id] ?? []).length > 0}
									<ul class="list">
										{#each workExperienceKeyPoints[workExperience.id] ?? [] as keyPoint (keyPoint.id)}
											<li>{keyPoint.key_point}</li>
										{/each}
									</ul>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<div
				class="panel"
				hidden={activeTab !== 'portfolio'}
				role="tabpanel"
				id="panel-portfolio"
				aria-labelledby="tab-portfolio"
				tabindex="0"
			>
				{#if portfolioProjects.length === 0}
					<div class="card empty-state">No portfolio projects yet.</div>
				{:else}
					<div class="stack">
						{#each portfolioProjects as project (project.id)}
							<div class="card section-card">
								<div class="section-head">
									<div>
										<h2>{project.project_name}</h2>
										{#if project.description}
											<p class="subtle">{project.description}</p>
										{/if}
									</div>
									<div class="link-group">
										{#if project.project_link}
											<a class="link" href={project.project_link} target="_blank" rel="external">
												Preview
											</a>
										{/if}
										{#if project.source_code_link}
											<a
												class="link"
												href={project.source_code_link}
												target="_blank"
												rel="external"
											>
												Source
											</a>
										{/if}
									</div>
								</div>
								{#if (portfolioTechnologies[project.id] ?? []).length > 0}
									<div class="chips">
										{#each portfolioTechnologies[project.id] ?? [] as technology (technology.id)}
											<span class="chip">{technology.technology_name}</span>
										{/each}
									</div>
								{/if}
								{#if (portfolioKeyPoints[project.id] ?? []).length > 0}
									<ul class="list">
										{#each portfolioKeyPoints[project.id] ?? [] as keyPoint (keyPoint.id)}
											<li>{keyPoint.key_point}</li>
										{/each}
									</ul>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<div
				class="panel"
				hidden={activeTab !== 'skills'}
				role="tabpanel"
				id="panel-skills"
				aria-labelledby="tab-skills"
				tabindex="0"
			>
				{#if skills.length === 0}
					<div class="card empty-state">No skills added yet.</div>
				{:else}
					<div class="card">
						<div class="stack compact">
							{#each skills as skill (skill.id)}
								<div class="skill-row">
									<div>
										<p class="skill-name">{skill.skill_name}</p>
										<p class="meta">{skill.confidence_percentage}% confidence</p>
									</div>
									<div class="skill-track" aria-hidden="true">
										<div class="skill-bar" style={`width: ${skill.confidence_percentage}%`}></div>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<div
				class="panel"
				hidden={activeTab !== 'languages'}
				role="tabpanel"
				id="panel-languages"
				aria-labelledby="tab-languages"
				tabindex="0"
			>
				{#if languages.length === 0}
					<div class="card empty-state">No languages or frameworks added yet.</div>
				{:else}
					<div class="stack">
						{#each languages as language (language.id)}
							<div class="card section-card">
								<div class="section-head language-head">
									<h2>{language.language_name}</h2>
									<p class="meta">
										{(frameworks[language.id] ?? []).length}
										{(frameworks[language.id] ?? []).length === 1 ? 'framework' : 'frameworks'}
									</p>
								</div>
								{#if (frameworks[language.id] ?? []).length > 0}
									<div class="chips">
										{#each frameworks[language.id] ?? [] as framework (framework.id)}
											<span class="chip">{framework.framework_name}</span>
										{/each}
									</div>
								{:else}
									<p class="subtle">No frameworks listed.</p>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
		margin-top: 2.5rem;
		margin-bottom: 2rem;
	}

	h1 {
		margin: 0;
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
	}

	.button.secondary {
		background: white;
		color: #0f172a;
	}

	.grid {
		display: grid;
		gap: 16px;
		margin-top: 16px;
	}

	.content {
		min-width: 0;
	}

	.card {
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		background: white;
		padding: 14px;
	}

	.profile-image {
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		background: white;
		padding: 6px;
		width: 14em;
		height: 14em;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.profile-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: 8px;
	}

	.tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-bottom: 16px;
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

	.stack {
		display: grid;
		gap: 12px;
	}

	.stack.compact {
		gap: 16px;
	}

	.section-card {
		display: grid;
		gap: 12px;
	}

	.section-head {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		gap: 12px;
		align-items: flex-start;
	}

	.language-head {
		align-items: center;
	}

	.section-head h2 {
		margin: 0;
		font-size: 18px;
	}

	.meta {
		margin: 0;
		color: #64748b;
		font-size: 13px;
		white-space: nowrap;
	}

	.subtle {
		margin: 0;
		color: #334155;
		line-height: 1.5;
	}

	.list {
		margin: 0;
		padding-left: 18px;
		color: #0f172a;
		display: grid;
		gap: 8px;
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.chip {
		padding: 6px 10px;
		border-radius: 999px;
		background: #eff6ff;
		color: #1d4ed8;
		font-size: 13px;
	}

	.link {
		color: #2563eb;
		text-decoration: none;
		word-break: break-word;
	}

	.link:hover {
		text-decoration: underline;
	}

	.link-group {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		justify-content: flex-end;
	}

	.empty-state {
		color: #64748b;
	}

	.section-error {
		margin: 0 0 12px;
	}

	.skill-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(120px, 240px);
		gap: 16px;
		align-items: center;
	}

	.skill-name {
		margin: 0;
		font-weight: 600;
		color: #0f172a;
	}

	.skill-track {
		height: 10px;
		border-radius: 999px;
		background: #e2e8f0;
		overflow: hidden;
	}

	.skill-bar {
		height: 100%;
		border-radius: inherit;
		background: linear-gradient(90deg, #2563eb, #0f172a);
	}

	.row {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		padding: 8px 0;
		border-bottom: 1px solid #f1f5f9;
	}

	.row:last-child {
		border-bottom: 0;
	}

	.k {
		color: #475569;
		font-size: 13px;
	}

	.v {
		color: #0f172a;
		font-size: 13px;
		text-align: right;
	}

	.error {
		color: #b91c1c;
	}

	.muted {
		color: #475569;
		margin: 0;
	}

	@media (min-width: 900px) {
		.grid {
			grid-template-columns: auto minmax(0, 1fr);
			align-items: start;
		}
	}

	@media (max-width: 640px) {
		.section-head,
		.skill-row {
			grid-template-columns: 1fr;
			display: grid;
		}

		.link-group {
			justify-content: flex-start;
		}

		.meta,
		.v {
			white-space: normal;
		}
	}
</style>
