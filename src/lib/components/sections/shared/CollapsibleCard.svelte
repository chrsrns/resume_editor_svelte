<script lang="ts">
	import Card from '$lib/components/sections/shared/Card.svelte';
	import DragHandle from '$lib/components/sections/shared/DragHandle.svelte';

	type Variant = 'card' | 'new';

	let {
		variant = 'card',
		class: className = '',
		innerClass = '',
		ariaLabel = 'Collapsible card',
		collapsedTitle,
		collapsed = $bindable(false),
		draggable = false,
		dragDisabled = false,
		dragging = false,
		dragLabel = 'Toggle and reorder',
		ondragstart,
		ondragend,
		onkeydown,
		dropOver = false,
		ondragover,
		ondrop,
		children
	} = $props<{
		variant?: Variant;
		class?: string;
		innerClass?: string;
		ariaLabel?: string;
		collapsedTitle: string;
		collapsed?: boolean;
		draggable?: boolean;
		dragDisabled?: boolean;
		dragging?: boolean;
		dragLabel?: string;
		ondragstart?: (e: DragEvent) => void;
		ondragend?: (e: DragEvent) => void;
		onkeydown?: (e: KeyboardEvent) => void;
		dropOver?: boolean;
		ondragover?: (e: DragEvent) => void;
		ondrop?: (e: DragEvent) => void;
		children: import('svelte').Snippet;
	}>();

	function toggle() {
		if (draggable && (dragDisabled || dragging)) return;
		collapsed = !collapsed;
	}

	function handleHandleKeydown(e: KeyboardEvent) {
		if ((e.key === 'Enter' || e.key === ' ') && !(draggable && (dragDisabled || dragging))) {
			e.preventDefault();
			toggle();
			return;
		}
		onkeydown?.(e);
	}

	function innerClasses() {
		return ['collapsible', innerClass].filter(Boolean).join(' ');
	}
</script>

<Card {variant} class={className}>
	<div
		class={innerClasses()}
		role="group"
		aria-label={ariaLabel}
		class:dropOver
		{ondragover}
		{ondrop}
	>
		<div class="header">
			{#if draggable}
				<DragHandle
					disabled={dragDisabled}
					{dragging}
					label={dragLabel}
					variant="bare"
					onclick={toggle}
					{ondragstart}
					{ondragend}
					onkeydown={handleHandleKeydown}
				/>
			{:else}
				<button
					type="button"
					class="toggle"
					aria-label={collapsed ? 'Expand' : 'Collapse'}
					onclick={toggle}
				>
					{collapsed ? '▸' : '▾'}
				</button>
			{/if}
			<strong class="title">{collapsedTitle}</strong>
		</div>

		{#if !collapsed}
			<div class="body">{@render children()}</div>
		{/if}
	</div>
</Card>

<style>
	.collapsible {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.collapsible.dropOver {
		outline: 2px dashed #0f172a;
		outline-offset: 4px;
	}

	.header {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.title {
		font-size: 14px;
		margin: 0;
	}

	.toggle {
		width: 30px;
		height: 30px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		background: #ffffff;
		cursor: pointer;
		user-select: none;
		flex: 0 0 auto;
		padding: 0;
	}

	.toggle:focus-visible {
		outline: 2px solid #0f172a;
		outline-offset: 2px;
	}

	.body {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
</style>
