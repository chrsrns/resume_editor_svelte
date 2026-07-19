<script lang="ts">
    import type { Component } from 'svelte';

    type Tab = {
        id: string;
        label: string;
        Icon: Component;
    };

    let { tabs, activeTab, onselect, onkeydown } = $props<{
        tabs: readonly Tab[];
        activeTab: string;
        onselect: (id: string) => void;
        onkeydown: (e: KeyboardEvent) => void;
    }>();
</script>

<div class="tabs" role="tablist" aria-label="Resume sections" tabindex="0" {onkeydown}>
    {#each tabs as t (t.id)}
        <button
            class="tab {activeTab === t.id ? 'active' : ''}"
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            aria-controls={`panel-${t.id}`}
            id={`tab-${t.id}`}
            tabindex={activeTab === t.id ? 0 : -1}
            onclick={() => onselect(t.id)}
            data-tab={t.id}
        >
            <span class="tabIcon">
                <t.Icon size={16} />
            </span>
            {t.label}
        </button>
    {/each}
</div>

<style>
    .tabs {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
        margin-bottom: var(--space-5);
    }

    .tab {
        display: inline-flex;
        align-items: center;
        gap: var(--space-1-5);
        padding: var(--space-2) var(--space-3-5);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-pill);
        background: var(--color-surface);
        color: var(--color-text);
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        line-height: 1;
    }

    .tab:hover {
        border-color: var(--color-primary);
        color: var(--color-primary);
        background: var(--color-primary-light);
    }

    .tab.active {
        border-color: var(--color-primary);
        background: var(--color-primary);
        color: var(--color-surface);
    }

    .tab:focus-visible {
        outline: 2px solid var(--color-primary);
        outline-offset: 2px;
    }

    .tabIcon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
    }
</style>
