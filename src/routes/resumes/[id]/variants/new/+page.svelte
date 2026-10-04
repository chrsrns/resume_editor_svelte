<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { resolve } from '$app/paths';
    import { page } from '$app/state';
    import { authToken } from '$lib/auth';
    import NewVariantForm from '$lib/components/NewVariantForm.svelte';

    const baseId = $derived(Number(page.params.id));

    onMount(() => {
        if (!$authToken) {
            void goto(resolve('/auth/login'));
        }
    });
</script>

<svelte:head>
    <title>New variant - Resume Editor</title>
</svelte:head>

{#if $authToken}
    <h1>New variant</h1>
    <NewVariantForm
        {baseId}
        oncancel={() => goto(resolve(`/resumes/${baseId}`))}
    />
{/if}
