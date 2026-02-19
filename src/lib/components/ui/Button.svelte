<script lang="ts">
	type Variant = 'primary' | 'secondary' | 'danger';

	let {
		variant = 'primary',
		type = 'button',
		disabled = false,
		title,
		onclick,
		class: className = '',
		children
	} = $props<{
		variant?: Variant;
		type?: 'button' | 'submit' | 'reset';
		disabled?: boolean;
		title?: string;
		onclick?: (event: MouseEvent) => void;
		class?: string;
		children: import('svelte').Snippet;
	}>();

	function classes() {
		return ['button', variant === 'primary' ? '' : variant, className].filter(Boolean).join(' ');
	}
</script>

<button class={classes()} {type} {disabled} {title} {onclick}>
	{@render children()}
</button>

<style>
	.button {
		padding: 10px 12px;
		border: 1px solid #0f172a;
		border-radius: 8px;
		background: #0f172a;
		color: white;
		cursor: pointer;
		flex: 0 0 auto;
	}

	.button.secondary {
		background: white;
		color: #0f172a;
	}

	.button.danger {
		border-color: #b91c1c;
		background: #b91c1c;
	}

	.button[disabled] {
		opacity: 0.7;
		cursor: not-allowed;
	}
</style>
