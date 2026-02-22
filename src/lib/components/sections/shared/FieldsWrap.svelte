<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		class: className = '',
		children,
		...rest
	} = $props<
		{
			class?: string;
			children: import('svelte').Snippet;
		} & HTMLAttributes<HTMLDivElement>
	>();

	function classes() {
		return ['fields', className].filter(Boolean).join(' ');
	}
</script>

<div {...rest} class={classes()}>
	{@render children()}
</div>

<style>
	.fields {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		align-items: center;
	}

	.fields.dropOver {
		outline: 2px dashed #0f172a;
		outline-offset: 2px;
		border-radius: 8px;
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
