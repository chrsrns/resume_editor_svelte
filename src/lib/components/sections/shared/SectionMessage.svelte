<script lang="ts">
	let {
		error = null,
		loading = false,
		empty = false,
		emptyText = 'No items yet.',
		loadingText = 'Loading…',
		children
	} = $props<{
		error?: string | null;
		loading?: boolean;
		empty?: boolean;
		emptyText?: string;
		loadingText?: string;
		children?: import('svelte').Snippet;
	}>();
</script>

{#if error}
	<p class="error">{error}</p>
{/if}

{#if loading}
	<p>{loadingText}</p>
{:else if empty}
	<p class="muted">{emptyText}</p>
{:else if children}
	{@render children()}
{/if}

<style>
	.error {
		color: #b91c1c;
		margin: 0 0 10px;
	}

	.muted {
		color: #475569;
		margin: 0;
	}
</style>
