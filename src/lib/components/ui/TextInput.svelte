<script lang="ts">
    import type { HTMLInputAttributes } from 'svelte/elements';

    type LabelVariant = 'floating' | 'above';

    let {
        value = $bindable(''),
        type = 'text',
        label,
        labelVariant = 'floating',
        placeholder,
        title,
        min,
        max,
        step,
        oninput,
        disabled = false,
        small = false,
        class: className = '',
        ...rest
    } = $props<
        {
            value?: string;
            type?: string;
            label?: string;
            labelVariant?: LabelVariant;
            placeholder?: string;
            title?: string;
            min?: string | number;
            max?: string | number;
            step?: string | number;
            oninput?: (event: Event) => void;
            disabled?: boolean;
            small?: boolean;
            class?: string;
        } & Omit<
            HTMLInputAttributes,
            | 'value'
            | 'type'
            | 'placeholder'
            | 'title'
            | 'min'
            | 'max'
            | 'step'
            | 'oninput'
            | 'disabled'
            | 'class'
        >
    >();

    function inputClasses() {
        return ['input', small ? 'small' : '', className].filter(Boolean).join(' ');
    }

    const dataFieldWidth = $derived(small ? 'small' : type === 'date' ? 'date' : 'grow');

    function fieldClasses() {
        const hasValue = value.trim().length > 0;
        return [
            'uiField',
            labelVariant,
            small ? 'small' : '',
            type === 'date' ? 'date' : '',
            hasValue ? 'hasValue' : ''
        ]
            .filter(Boolean)
            .join(' ');
    }

    function handleInput(event: Event) {
        value = (event.target as HTMLInputElement).value;
        oninput?.(event);
    }
</script>

{#if label}
    <label class={fieldClasses()} data-field-width={dataFieldWidth}>
        {#if labelVariant === 'above'}
            <span class="label">{label}</span>
        {/if}
        <input
            {...rest}
            class={inputClasses()}
            {value}
            {type}
            {placeholder}
            {title}
            {min}
            {max}
            {step}
            {disabled}
            oninput={handleInput}
        />
        {#if labelVariant === 'floating'}
            <span class="label">{label}</span>
        {/if}
    </label>
{:else}
    <input
        {...rest}
        class={inputClasses()}
        data-field-width={dataFieldWidth}
        {value}
        {type}
        {placeholder}
        {title}
        {min}
        {max}
        {step}
        {disabled}
        oninput={handleInput}
    />
{/if}

<style>
    .uiField {
        position: relative;
        display: flex;
        width: 100%;
    }

    .uiField.above {
        flex-direction: column;
        gap: var(--space-1-5);
    }

    .uiField.floating {
        flex-direction: column;
    }

    .input {
        box-sizing: border-box;
        padding: var(--space-2-5) var(--space-3);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        background: var(--color-surface);
    }

    .input:focus-visible {
        outline: 2px solid var(--color-primary);
        outline-offset: 2px;
    }

    .uiField.floating .input {
        padding: var(--space-2-5) var(--space-3);
    }

    .uiField.floating.date .input {
        padding: var(--space-2-5) var(--space-3);
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
        left: var(--space-3);
        top: 50%;
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

    .uiField.floating.date .label {
        top: calc(-1 * var(--space-2));
        transform: translateY(0);
        font-size: 11px;
        background: var(--color-surface);
        padding: 0 var(--space-1);
    }

    .uiField.floating.hasValue .label,
    .uiField.floating:focus-within .label {
        top: calc(-1 * var(--space-2));
        transform: translateY(0);
        font-size: 11px;
        background: var(--color-surface);
        padding: 0 var(--space-1);
    }

    .uiField.floating:focus-within .label {
        color: var(--color-primary);
    }

    .input.small {
        padding: var(--space-2-5) var(--space-2);
    }

    .uiField.floating .input.small {
        padding: var(--space-4-5) var(--space-2) var(--space-2);
    }

    .uiField.floating.date .input.small {
        padding: var(--space-2-5) var(--space-2);
    }
</style>
