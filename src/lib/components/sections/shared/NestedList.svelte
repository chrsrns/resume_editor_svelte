<script lang="ts">
	let {
		title,
		loading = false,
		empty = false,
		emptyText = 'No items.',
		children
	} = $props<{
		title: string;
		loading?: boolean;
		empty?: boolean;
		emptyText?: string;
		children: import('svelte').Snippet;
	}>();
</script>

<div class="nested">
	<div class="nestedHead">
		<strong>{title}</strong>
		{#if loading}
			<span class="muted">Loading…</span>
		{/if}
	</div>

	{#if empty}
		<p class="muted">{emptyText}</p>
	{:else}
		<div class="nestedBody">{@render children()}</div>
	{/if}
</div>

<style>
	.nested {
		padding-top: 10px;
		border-top: 1px solid #e2e8f0;
	}

	.nestedHead {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		margin-bottom: 10px;
	}

	.nestedBody {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.muted {
		color: #475569;
		margin: 0;
	}
</style>
