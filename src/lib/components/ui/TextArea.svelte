<script lang="ts">
    import { tick } from 'svelte';
    import { fromAction } from 'svelte/attachments';
    import type { HTMLTextareaAttributes } from 'svelte/elements';

    type LabelVariant = 'floating' | 'above';

    let {
        value = $bindable(''),
        label,
        labelVariant = 'floating',
        placeholder,
        title,
        rows = 2,
        maxRows = 8,
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
            maxRows?: number;
            oninput?: (event: Event) => void;
            disabled?: boolean;
            class?: string;
        } & Omit<
            HTMLTextareaAttributes,
            'value' | 'placeholder' | 'title' | 'rows' | 'oninput' | 'disabled' | 'class'
        >
    >();

    let skipNextProgrammaticResize = false;

    function toPx(value: string): number {
        const n = Number.parseFloat(value);
        return Number.isFinite(n) ? n : 0;
    }

    function getLineHeight(style: CSSStyleDeclaration): number {
        const lh = Number.parseFloat(style.lineHeight);
        if (Number.isFinite(lh)) return lh;
        const fontSize = Number.parseFloat(style.fontSize);
        if (Number.isFinite(fontSize)) return fontSize * 1.2;
        return 16 * 1.2;
    }

    function syncHeight(textareaEl: HTMLTextAreaElement) {
        const style = getComputedStyle(textareaEl);
        const paddingY = toPx(style.paddingTop) + toPx(style.paddingBottom);
        const borderY = toPx(style.borderTopWidth) + toPx(style.borderBottomWidth);
        const lineHeight = getLineHeight(style);

        const resolvedRows = Math.max(1, rows);
        const resolvedMaxRows = Math.max(resolvedRows, maxRows);

        const minScrollHeight = lineHeight * resolvedRows + paddingY;
        const maxScrollHeight = lineHeight * resolvedMaxRows + paddingY;

        textareaEl.style.height = 'auto';
        const needed = Math.max(textareaEl.scrollHeight, minScrollHeight);
        const clamped = Math.min(needed, maxScrollHeight);
        textareaEl.style.overflowY = needed > maxScrollHeight ? 'auto' : 'hidden';
        textareaEl.style.height = `${clamped + borderY}px`;
    }

    function autosize(
        node: HTMLTextAreaElement,
        _params: { value: string; rows: number; maxRows: number }
    ) {
        let destroyed = false;
        const tabPanel = node.closest<HTMLElement>('[role="tabpanel"], .panel');
        let tabPanelObserver: MutationObserver | null = null;

        async function resize() {
            await tick();
            if (destroyed) return;
            syncHeight(node);
        }

        void resize();

        if (tabPanel) {
            tabPanelObserver = new MutationObserver(() => {
                if (destroyed) return;
                if (!tabPanel.hasAttribute('hidden')) {
                    void resize();
                }
            });
            tabPanelObserver.observe(tabPanel, { attributes: true, attributeFilter: ['hidden'] });
        }

        return {
            update(_nextParams: { value: string; rows: number; maxRows: number }) {
                if (skipNextProgrammaticResize) {
                    skipNextProgrammaticResize = false;
                    return;
                }
                void resize();
            },
            destroy() {
                destroyed = true;
                tabPanelObserver?.disconnect();
                tabPanelObserver = null;
            }
        };
    }

    function textareaClasses() {
        return ['textarea', className].filter(Boolean).join(' ');
    }

    function fieldClasses() {
        const hasValue = value.trim().length > 0;
        return ['uiField', labelVariant, hasValue ? 'hasValue' : ''].filter(Boolean).join(' ');
    }

    function handleInput(event: Event) {
        skipNextProgrammaticResize = true;
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
            {@attach fromAction(autosize, () => ({ value, rows, maxRows }))}
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
        {@attach fromAction(autosize, () => ({ value, rows, maxRows }))}
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
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        background: var(--color-surface);
        width: 100%;
        resize: vertical;
    }

    .uiField.floating .textarea {
        padding: 10px 12px;
    }

    .label {
        color: var(--color-muted);
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
        color: var(--color-primary);
    }
</style>
