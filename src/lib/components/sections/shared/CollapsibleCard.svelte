<script lang="ts">
    import { onMount, untrack } from 'svelte';
    import { fade, slide } from 'svelte/transition';
    import Card from '$lib/components/sections/shared/Card.svelte';
    import DragHandle from '$lib/components/sections/shared/DragHandle.svelte';
    import ChevronRight from '@lucide/svelte/icons/chevron-right';
    import ChevronDown from '@lucide/svelte/icons/chevron-down';

    type Variant = 'card' | 'new';

    let {
        variant = 'card',
        class: className = '',
        innerClass = '',
        ariaLabel = 'Collapsible card',
        collapsed,
        defaultCollapsed = false,
        oncollapsedchange,
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
        children,
        titleHeader
    } = $props<{
        variant?: Variant;
        class?: string;
        innerClass?: string;
        ariaLabel?: string;
        collapsed?: boolean;
        defaultCollapsed?: boolean;
        oncollapsedchange?: (next: boolean) => void;
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
        titleHeader: import('svelte').Snippet;
    }>();

    let internalCollapsed = $state(
        untrack(() => (collapsed === undefined ? defaultCollapsed : false))
    );
    let enableAnimations = $state(false);
    let prefersReducedMotion = $state(false);

    onMount(() => {
        enableAnimations = true;
        const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
        prefersReducedMotion = mql.matches;
        const onChange = (e: MediaQueryListEvent) => {
            prefersReducedMotion = e.matches;
        };
        mql.addEventListener('change', onChange);
        return () => mql.removeEventListener('change', onChange);
    });

    function isControlled(): boolean {
        return collapsed !== undefined;
    }

    function currentCollapsed(): boolean {
        return isControlled() ? (collapsed as boolean) : internalCollapsed;
    }

    function toggle() {
        if (draggable && (dragDisabled || dragging)) return;
        const next = !currentCollapsed();
        if (isControlled()) {
            oncollapsedchange?.(next);
        } else {
            internalCollapsed = next;
        }
    }

    function slideDurationMs(): number {
        if (!enableAnimations) return 0;
        if (prefersReducedMotion) return 0;
        return 180;
    }

    function fadeDurationMs(): number {
        if (!enableAnimations) return 0;
        if (prefersReducedMotion) return 0;
        return 120;
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

    let dragPreviewRoot: HTMLDivElement | null = $state(null);
    let dragImageEl: HTMLElement | null = $state(null);

    function dragPreviewRootAttachment(node: HTMLDivElement) {
        dragPreviewRoot = node;
        return () => {
            if (dragPreviewRoot === node) dragPreviewRoot = null;
        };
    }

    function cleanupDragImage() {
        dragImageEl?.remove();
        dragImageEl = null;
    }

    function handleDragStart(e: DragEvent) {
        cleanupDragImage();
        if (!draggable || dragDisabled) {
            ondragstart?.(e);
            return;
        }
        if (!e.dataTransfer || !dragPreviewRoot) {
            ondragstart?.(e);
            return;
        }

        const rect = dragPreviewRoot.getBoundingClientRect();
        const clone = dragPreviewRoot.cloneNode(true) as HTMLElement;
        clone.style.width = `${rect.width}px`;
        clone.style.height = `${rect.height}px`;
        clone.style.position = 'fixed';
        clone.style.top = '-10000px';
        clone.style.left = '-10000px';
        clone.style.pointerEvents = 'none';
        clone.style.zIndex = '2147483647';
        document.body.appendChild(clone);
        dragImageEl = clone;

        const hasPointerCoords = e.clientX !== 0 || e.clientY !== 0;
        const offsetX = hasPointerCoords
            ? Math.max(0, Math.min(rect.width, e.clientX - rect.left))
            : 16;
        const offsetY = hasPointerCoords
            ? Math.max(0, Math.min(rect.height, e.clientY - rect.top))
            : 16;

        e.dataTransfer.setDragImage(clone, offsetX, offsetY);
        ondragstart?.(e);
    }

    function handleDragEnd(e: DragEvent) {
        cleanupDragImage();
        ondragend?.(e);
    }
</script>

<div {@attach dragPreviewRootAttachment}>
    <Card {variant} class={className + ' no-padding'}>
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
                        ondragstart={handleDragStart}
                        ondragend={handleDragEnd}
                        onkeydown={handleHandleKeydown}
                    />
                {:else}
                    <button
                        type="button"
                        class="toggle"
                        aria-label={currentCollapsed() ? 'Expand' : 'Collapse'}
                        onclick={toggle}
                    >
                        {#if currentCollapsed()}
                            <ChevronRight size={16} />
                        {:else}
                            <ChevronDown size={16} />
                        {/if}
                    </button>
                {/if}
                <button type="button" class="title" onclick={toggle}>
                    {@render titleHeader()}
                </button>
            </div>

            {#if !currentCollapsed()}
                <div class="bodyWrap" transition:slide={{ duration: slideDurationMs() }}>
                    <div class="body" transition:fade={{ duration: fadeDurationMs() }}>
                        {@render children()}
                    </div>
                </div>
            {/if}
        </div>
    </Card>
</div>

<style>
    .collapsible {
        display: flex;
        flex-direction: column;
    }

    .collapsible.dropOver {
        outline: 2px dashed var(--color-primary);
        outline-offset: 4px;
    }

    .header {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-3);
    }

    .title {
        font-size: 14px;
        font-weight: 600;
        margin: 0;
        padding: 0;
        border: none;
        background: transparent;
        cursor: pointer;
        text-align: left;
        color: var(--color-text);
    }

    .title:focus-visible {
        outline: 2px solid var(--color-primary);
        outline-offset: 6px;
        border-radius: var(--radius-sm);
    }

    .toggle {
        width: 30px;
        height: 30px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        background: var(--color-surface);
        color: var(--color-muted);
        cursor: pointer;
        user-select: none;
        flex: 0 0 auto;
        padding: 0;
    }

    .toggle:focus-visible {
        outline: 2px solid var(--color-primary);
        outline-offset: 2px;
    }

    .body {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
        padding: 0 var(--space-3) var(--space-3);
    }

    .bodyWrap {
        overflow: hidden;
    }
</style>
