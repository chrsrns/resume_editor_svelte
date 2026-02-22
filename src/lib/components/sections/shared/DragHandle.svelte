<script lang="ts">
	let {
		disabled = false,
		dragging = false,
		label = 'Reorder',
		class: className = '',
		ondragstart,
		ondragend,
		onkeydown
	} = $props<{
		disabled?: boolean;
		dragging?: boolean;
		label?: string;
		class?: string;
		ondragstart?: (e: DragEvent) => void;
		ondragend?: (e: DragEvent) => void;
		onkeydown?: (e: KeyboardEvent) => void;
	}>();

	function classes() {
		return ['handle', dragging ? 'dragging' : '', disabled ? 'disabled' : '', className]
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
	{ondragstart}
	{ondragend}
	{onkeydown}
>
	<span class="grip" aria-hidden="true"></span>
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
		cursor: grab;
		user-select: none;
		flex: 0 0 auto;
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
		width: 14px;
		height: 14px;
		background:
			linear-gradient(#64748b 0 0) left 0 top 2px / 4px 2px no-repeat,
			linear-gradient(#64748b 0 0) left 0 center / 4px 2px no-repeat,
			linear-gradient(#64748b 0 0) left 0 bottom 2px / 4px 2px no-repeat,
			linear-gradient(#64748b 0 0) right 0 top 2px / 4px 2px no-repeat,
			linear-gradient(#64748b 0 0) right 0 center / 4px 2px no-repeat,
			linear-gradient(#64748b 0 0) right 0 bottom 2px / 4px 2px no-repeat;
	}
</style>
