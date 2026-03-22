<script lang="ts">
	type Size = 'sm' | 'md';

	let {
		active,
		activeLabel = 'Active',
		inactiveLabel = 'Inactive',
		unknownLabel = 'Unknown',
		size = 'md',
		title,
		class: className = '',
		style
	} = $props<{
		active?: boolean | null;
		activeLabel?: string;
		inactiveLabel?: string;
		unknownLabel?: string;
		size?: Size;
		title?: string;
		class?: string;
		style?: string;
	}>();

	function text() {
		if (active === true) return activeLabel;
		if (active === false) return inactiveLabel;
		return unknownLabel;
	}

	function variant() {
		if (active === true) return 'active';
		if (active === false) return 'inactive';
		return 'unknown';
	}

	function classes() {
		return ['activeStatus', size, variant(), className].filter(Boolean).join(' ');
	}
</script>

<span {style} class={classes()} {title}>{text()}</span>

<style>
	.activeStatus {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 999px;
		padding: 4px 10px;
		font-size: 12px;
		line-height: 1;
		border: 1px solid transparent;
		white-space: nowrap;
	}

	.activeStatus.sm {
		padding: 3px 8px;
		font-size: 11px;
	}

	.activeStatus.md {
		padding: 4px 10px;
		font-size: 12px;
	}

	.activeStatus.active {
		background: #dcfce7;
		border-color: #16a34a;
		color: #166534;
	}

	.activeStatus.inactive {
		background: #f1f5f9;
		border-color: #94a3b8;
		color: #334155;
	}

	.activeStatus.unknown {
		background: #fef9c3;
		border-color: #eab308;
		color: #854d0e;
	}
</style>
