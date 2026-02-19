<script lang="ts">
	let {
		compact = false,
		class: className = '',
		children
	} = $props<{
		compact?: boolean;
		class?: string;
		children: import('svelte').Snippet;
	}>();

	function classes() {
		return ['actions', compact ? 'compact' : '', className].filter(Boolean).join(' ');
	}
</script>

<div class={classes()}>
	{@render children()}
</div>

<style>
	.actions {
		margin-top: 10px;
		margin-bottom: 10px;
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}

	.actions.compact {
		margin-top: 0;
		margin-bottom: 0;
	}
</style>
