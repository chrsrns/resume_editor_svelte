<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { listResumes } from '$lib/api/resumes';
	import type { ApiError } from '$lib/api/client';
	import type { Resume } from '$lib/types';
	import { authToken } from '$lib/auth';
	import { currentUser } from '$lib/session';

	let loading = $state(true);
	let error = $state<string | null>(null);
	let resumes = $state<Resume[]>([]);

	async function loadResumes() {
		loading = true;
		error = null;
		try {
			resumes = await listResumes();
		} catch (e) {
			const err = e as ApiError;
			error = err.message;
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		void loadResumes();
	});
</script>

<svelte:head>
	<title>Resumes - Resume Editor</title>
</svelte:head>

<div class="header">
	<div>
		<h1>Resumes</h1>
		<p class="muted">Public resumes, plus your private resumes when logged in.</p>
	</div>
	<div class="actions">
		{#if $authToken}
			<a class="button" href={resolve('/resumes/new')}>New resume</a>
		{:else}
			<a class="button" href={resolve('/auth/login')}>Login to create</a>
		{/if}
	</div>
</div>

{#if loading}
	<p>Loading…</p>
{:else if error}
	<p class="error">{error}</p>
{:else if resumes.length === 0}
	<p class="muted">No resumes found.</p>
{:else}
	<ul class="list">
		{#each resumes as r (r.id)}
			<li class="item">
				<a class="itemLink" href={resolve('/resumes/[id]', { id: r.id.toString() })}>
					<div class="titleRow">
						<strong>{r.name}</strong>
						{#if r.is_public}
							<span class="tag">Public</span>
						{:else}
							<span class="tag private">Private</span>
						{/if}
						{#if $currentUser && r.created_by === $currentUser.id}
							<span class="tag mine">Mine</span>
						{/if}
					</div>
					<div class="meta">{r.email}</div>
				</a>
			</li>
		{/each}
	</ul>
{/if}

<button class="linkButton" type="button" onclick={loadResumes} disabled={loading}>Refresh</button>

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
	}

	.button {
		padding: 10px 14px;
		border: 1px solid #0f172a;
		border-radius: 8px;
		background: #0f172a;
		color: white;
		text-decoration: none;
	}

	.list {
		list-style: none;
		padding: 0;
		margin: 16px 0;
		display: grid;
		gap: 10px;
	}

	.item {
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		background: white;
	}

	.itemLink {
		display: block;
		padding: 12px 14px;
		color: inherit;
		text-decoration: none;
	}

	.titleRow {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.meta {
		color: #475569;
		font-size: 13px;
		margin-top: 4px;
	}

	.tag {
		font-size: 12px;
		padding: 2px 8px;
		border-radius: 999px;
		background: #e2e8f0;
		color: #0f172a;
	}

	.tag.private {
		background: #fee2e2;
		color: #7f1d1d;
	}

	.tag.mine {
		background: #dcfce7;
		color: #14532d;
	}

	.error {
		color: #b91c1c;
	}

	.muted {
		color: #475569;
	}

	.linkButton {
		padding: 0;
		border: 0;
		background: transparent;
		color: #0f172a;
		text-decoration: underline;
		cursor: pointer;
	}

	.linkButton[disabled] {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
