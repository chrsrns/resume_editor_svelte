<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { createResume } from '$lib/api/resumes';
	import { authToken } from '$lib/auth';
	import ResumeForm from '$lib/components/ResumeForm.svelte';
	import type { ApiError } from '$lib/api/client';
	import type { NewResumeRequest } from '$lib/types';

	let error = $state<string | null>(null);
	let loading = $state(false);

	onMount(() => {
		if (!$authToken) {
			void goto('/auth/login');
		}
	});

	async function handleSubmit(payload: NewResumeRequest & { is_public: boolean }) {
		error = null;
		loading = true;

		try {
			const created = await createResume(payload);
			await goto(`/resumes/${created.id}`);
		} catch (e) {
			const err = e as ApiError;
			error = err.message;
		} finally {
			loading = false;
		}
	}
</script>

<h1>New resume</h1>

{#if error}
	<p class="error">{error}</p>
{/if}

<ResumeForm submitLabel={loading ? 'Creating…' : 'Create'} onsubmit={handleSubmit} />

<style>
	.error {
		color: #b91c1c;
	}
</style>
