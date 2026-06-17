<script lang="ts">
    import type { Component } from 'svelte';
    import CopyButton from '$lib/components/ui/CopyButton.svelte';

    let {
        Icon,
        label,
        value,
        href,
        copyable = true
    } = $props<{
        Icon: Component<{ size?: number }>;
        label: string;
        value: string;
        href?: string;
        copyable?: boolean;
    }>();
</script>

<div class="fieldRow">
    <div class="left">
        <div class="iconBox">
            <Icon size={18} />
        </div>
        <span class="label">{label}</span>
    </div>
    <div class="right">
        {#if href}
            <a class="value link" {href} target="_blank" rel="external" title={value}>
                {value}
            </a>
        {:else}
            <span class="value" title={value}>{value}</span>
        {/if}
        {#if copyable}
            <CopyButton {value} />
        {/if}
    </div>
</div>

<style>
    .fieldRow {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-4);
        padding: var(--space-3) var(--space-4);
        border-bottom: 1px solid var(--color-border);
    }

    .fieldRow:last-child {
        border-bottom: none;
    }

    .left {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        flex-shrink: 0;
    }

    .iconBox {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border-radius: var(--radius-md);
        background: var(--color-primary-light);
        color: var(--color-primary);
    }

    .label {
        font-size: 14px;
        color: var(--color-muted);
        font-weight: 500;
    }

    .right {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        min-width: 0;
        flex: 1 1 auto;
        justify-content: flex-end;
    }

    .value {
        font-size: 14px;
        color: var(--color-text);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 420px;
    }

    .link {
        color: var(--color-primary);
        text-decoration: none;
    }

    .link:hover {
        text-decoration: underline;
    }

    @media (max-width: 640px) {
        .fieldRow {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--space-2);
        }

        .right {
            justify-content: flex-start;
            width: 100%;
        }

        .value {
            max-width: 100%;
        }
    }
</style>
