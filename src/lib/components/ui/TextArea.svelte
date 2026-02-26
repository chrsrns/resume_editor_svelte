<script lang="ts">
	import type { HTMLTextareaAttributes } from 'svelte/elements';

	type LabelVariant = 'floating' | 'above';

	let {
		value = $bindable(''),
		label,
		labelVariant = 'floating',
		placeholder,
		title,
		rows = 2,
		oninput,
		disabled = false,
		class: className = '',
		...rest
	} = $props<
		{
			value?: string;
			label?: string;
			labelVariant?: LabelVariant;
			placeholder?: string;
			title?: string;
			rows?: number;
			oninput?: (event: Event) => void;
			disabled?: boolean;
			class?: string;
		} & Omit<
			HTMLTextareaAttributes,
			'value' | 'placeholder' | 'title' | 'rows' | 'oninput' | 'disabled' | 'class'
		>
	>();

	function textareaClasses() {
		return ['textarea', className].filter(Boolean).join(' ');
	}

	function fieldClasses() {
		const hasValue = value.trim().length > 0;
		return ['uiField', labelVariant, hasValue ? 'hasValue' : ''].filter(Boolean).join(' ');
	}

	function handleInput(event: Event) {
		value = (event.target as HTMLTextAreaElement).value;
		oninput?.(event);
	}
</script>

{#if label}
	<label class={fieldClasses()}>
		{#if labelVariant === 'above'}
			<span class="label">{label}</span>
		{/if}
		<textarea
			{...rest}
			class={textareaClasses()}
			{rows}
			{placeholder}
			{title}
			{disabled}
			{value}
			oninput={handleInput}
		></textarea>
		{#if labelVariant === 'floating'}
			<span class="label">{label}</span>
		{/if}
	</label>
{:else}
	<textarea
		{...rest}
		class={textareaClasses()}
		{rows}
		{placeholder}
		{title}
		{disabled}
		{value}
		oninput={handleInput}
	></textarea>
{/if}

<style>
	.uiField {
		position: relative;
		display: flex;
		width: 100%;
	}

	.uiField.above {
		flex-direction: column;
		gap: 6px;
	}

	.uiField.floating {
		flex-direction: column;
	}

	.textarea {
		box-sizing: border-box;
		padding: 10px 12px;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		background: white;
		width: 100%;
		resize: vertical;
	}

	.uiField.floating .textarea {
		padding: 18px 12px 8px;
	}

	.label {
		color: #334155;
	}

	.uiField.above .label {
		position: static;
		font-size: 12px;
	}

	.uiField.floating .label {
		position: absolute;
		left: 12px;
		top: 22px;
		transform: translateY(-50%);
		font-size: 13px;
		pointer-events: none;
		transition:
			top 140ms ease,
			transform 140ms ease,
			font-size 140ms ease,
			color 140ms ease,
			background-color 140ms ease;
	}

	.uiField.floating.hasValue .label,
	.uiField.floating:focus-within .label {
		top: -8px;
		transform: translateY(0);
		font-size: 11px;
		background: white;
		padding: 0 4px;
	}

	.uiField.floating:focus-within .label {
		color: #2563eb;
	}
</style>
