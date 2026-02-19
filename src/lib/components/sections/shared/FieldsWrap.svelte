<script lang="ts">
	let { class: className = '', children } = $props<{
		class?: string;
		children: import('svelte').Snippet;
	}>();

	function classes() {
		return ['fields', className].filter(Boolean).join(' ');
	}
</script>

<div class={classes()}>
	{@render children()}
</div>

<style>
	.fields {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		align-items: center;
	}

	.fields :global(.input:not(.small)) {
		flex: 1 1 240px;
		min-width: 180px;
	}

	.fields :global(.input.small) {
		flex: 0 1 110px;
		min-width: 90px;
	}

	.fields :global(input[type='date'].input) {
		flex: 0 1 170px;
		min-width: 150px;
	}
</style>
