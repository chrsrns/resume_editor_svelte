<script lang="ts">
	let {
		value = $bindable(''),
		placeholder,
		title,
		rows = 2,
		oninput,
		disabled = false,
		class: className = ''
	} = $props<{
		value?: string;
		placeholder?: string;
		title?: string;
		rows?: number;
		oninput?: (event: Event) => void;
		disabled?: boolean;
		class?: string;
	}>();

	function classes() {
		return ['textarea', className].filter(Boolean).join(' ');
	}

	function handleInput(event: Event) {
		value = (event.target as HTMLTextAreaElement).value;
		oninput?.(event);
	}
</script>

<textarea class={classes()} {rows} {placeholder} {title} {disabled} {value} oninput={handleInput}
></textarea>

<style>
	.textarea {
		padding: 10px 12px;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		background: white;
		width: 100%;
		resize: vertical;
	}
</style>
