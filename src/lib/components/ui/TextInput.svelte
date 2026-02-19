<script lang="ts">
	let {
		value = $bindable(''),
		type = 'text',
		placeholder,
		title,
		min,
		max,
		step,
		oninput,
		disabled = false,
		small = false,
		class: className = ''
	} = $props<{
		value?: string;
		type?: string;
		placeholder?: string;
		title?: string;
		min?: string | number;
		max?: string | number;
		step?: string | number;
		oninput?: (event: Event) => void;
		disabled?: boolean;
		small?: boolean;
		class?: string;
	}>();

	function classes() {
		return ['input', small ? 'small' : '', className].filter(Boolean).join(' ');
	}

	function handleInput(event: Event) {
		value = (event.target as HTMLInputElement).value;
		oninput?.(event);
	}
</script>

<input
	class={classes()}
	{value}
	{type}
	{placeholder}
	{title}
	{min}
	{max}
	{step}
	{disabled}
	oninput={handleInput}
/>

<style>
	.input {
		padding: 10px 12px;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		background: white;
	}

	.input.small {
		padding: 10px 8px;
	}
</style>
