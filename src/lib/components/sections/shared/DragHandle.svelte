<script lang="ts">
	let {
		disabled = false,
		dragging = false,
		label = 'Reorder',
		variant = 'default',
		class: className = '',
		onclick,
		ondragstart,
		ondragend,
		onkeydown
	} = $props<{
		disabled?: boolean;
		dragging?: boolean;
		label?: string;
		variant?: 'default' | 'bare';
		class?: string;
		onclick?: (e: MouseEvent) => void;
		ondragstart?: (e: DragEvent) => void;
		ondragend?: (e: DragEvent) => void;
		onkeydown?: (e: KeyboardEvent) => void;
	}>();

	function classes() {
		return ['handle', variant, dragging ? 'dragging' : '', disabled ? 'disabled' : '', className]
			.filter(Boolean)
			.join(' ');
	}
</script>

<div
	class={classes()}
	role="button"
	tabindex={disabled ? -1 : 0}
	aria-label={label}
	draggable={!disabled}
	{onclick}
	{ondragstart}
	{ondragend}
	{onkeydown}
>
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="20"
		height="20"
		fill="currentColor"
		class="grip"
		viewBox="0 0 16 16"
		aria-hidden="true"
	>
		<path
			d="M7 2a1 1 0 1 1-2 0 1 1 0 0 1 2 0m3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0M7 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0m3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0M7 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0m3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0m-3 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0m3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0m-3 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0m3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0"
		/>
	</svg>
</div>

<style>
	.handle {
		width: 30px;
		height: 30px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		background: #ffffff;
		color: #64748b;
		cursor: grab;
		user-select: none;
		flex: 0 0 auto;
	}

	.handle.bare {
		width: 20px;
		border: none;
		background: transparent;
		color: #64748b;
	}

	.handle:focus-visible {
		outline: 2px solid #0f172a;
		outline-offset: 2px;
	}

	.handle.dragging {
		opacity: 0.7;
		cursor: grabbing;
	}

	.handle.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.grip {
		width: 20px;
		height: 20px;
		display: block;
	}
</style>
