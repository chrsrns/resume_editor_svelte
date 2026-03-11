<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { getResume } from '$lib/api/resumes';
	import type { ApiError } from '$lib/api/client';
	import type { Resume } from '$lib/types';
	import { currentUser } from '$lib/session';

	let loading = $state(true);
	let error = $state<string | null>(null);
	let resume = $state<Resume | null>(null);

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
			<p class="muted">{resume.email}</p>
		</div>
		<div class="actions">
			{#if $currentUser && resume.created_by === $currentUser.id}
				<a class="button" href={`/resumes/${resume.id}/edit`}>Edit</a>
			{/if}
			<a class="button secondary" href="/resumes">Back</a>
		</div>
	</div>

	<div class="grid">
		<div class="card">
			<div class="row">
				<span class="k">Visibility</span><span class="v"
					>{resume.is_public ? 'Public' : 'Private'}</span
				>
			</div>
			<div class="row">
				<span class="k">Location</span><span class="v">{resume.location ?? '-'}</span>
			</div>
			<div class="row">
				<span class="k">GitHub</span><span class="v">{resume.github_url ?? '-'}</span>
			</div>
			<div class="row">
				<span class="k">Mobile</span><span class="v">{resume.mobile_number ?? '-'}</span>
			</div>
		</div>

		{#if resume.profile_image_url}
			<div class="card">
				<img class="image" src={resume.profile_image_url} alt={`Profile of ${resume.name}`} />
			</div>
		{/if}
	</div>
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
	}

	.button.secondary {
		background: white;
		color: #0f172a;
	}

	.grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 12px;
		margin-top: 16px;
	}

	.card {
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		background: white;
		padding: 14px;
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

	.image {
		width: 100%;
		height: auto;
		display: block;
		border-radius: 8px;
	}

	.error {
		color: #b91c1c;
	}

	.muted {
		color: #475569;
		margin: 0;
	}
</style>
