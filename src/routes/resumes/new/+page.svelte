<script lang="ts">
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import { resolve } from '$app/paths';
    import { createResume } from '$lib/api/resumes';
    import { authToken } from '$lib/auth';
    import NewResumeForm from '$lib/components/NewResumeForm.svelte';
    import type { ApiError } from '$lib/api/client';
    import type { NewResumeRequest } from '$lib/types';

    let error = $state<string | null>(null);
    let loading = $state(false);

    onMount(() => {
        if (!$authToken) {
            void goto(resolve('/auth/login'));
        }
    });

    async function handleSubmit(payload: NewResumeRequest & { is_public: boolean }) {
        error = null;
        loading = true;

        try {
            const created = await createResume(payload);
            await goto(resolve(`/resumes/${created.id}`));
        } catch (e) {
            const err = e as ApiError;
            error = err.message;
        } finally {
            loading = false;
        }
    }
</script>

<svelte:head>
    <title>New resume - Resume Editor</title>
</svelte:head>

<h1>New resume</h1>

{#if error}
    <p class="error">{error}</p>
{/if}

<NewResumeForm
    submitLabel={loading ? 'Creating…' : 'Create'}
    showSubmitButton
    onsubmit={handleSubmit}
/>

<style>
    .error {
        color: #b91c1c;
    }
</style>
