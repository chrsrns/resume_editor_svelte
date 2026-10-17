<script lang="ts">
    import type { Visibility } from '$lib/types';

    let {
        value,
        name = 'visibility',
        onchange
    }: {
        value: Visibility;
        name?: string;
        onchange?: (value: Visibility) => void;
    } = $props();

    const options: { value: Visibility; label: string; help: string }[] = [
        { value: 'private', label: 'Private', help: 'Only you can see this resume.' },
        {
            value: 'unlisted',
            label: 'Unlisted',
            help: 'Anyone with the link can view it; hidden from listings.'
        },
        { value: 'public', label: 'Public', help: 'Visible to everyone, including in listings.' }
    ];
</script>

<fieldset class="visibilityGroup">
    <legend class="label">Visibility</legend>
    {#each options as option (option.value)}
        <label class="option">
            <input
                type="radio"
                {name}
                value={option.value}
                checked={value === option.value}
                onchange={() => onchange?.(option.value)}
            />
            <span class="optionText">
                <span class="optionLabel">{option.label}</span>
                <span class="help">{option.help}</span>
            </span>
        </label>
    {/each}
</fieldset>

<style>
    .visibilityGroup {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
        border: none;
        padding: 0;
        margin: 0;
        min-width: 0;
    }

    .label {
        font-size: 13px;
        font-weight: 600;
        color: var(--color-muted);
        padding: 0;
        margin-bottom: var(--space-1);
    }

    .option {
        display: flex;
        align-items: flex-start;
        gap: var(--space-2);
        cursor: pointer;
    }

    .option input {
        margin-top: var(--space-1);
    }

    .option input:focus-visible {
        outline: 2px solid var(--color-primary);
        outline-offset: 2px;
    }

    .optionText {
        display: flex;
        flex-direction: column;
    }

    .optionLabel {
        font-size: 14px;
        font-weight: 500;
    }

    .help {
        font-size: 12px;
        color: var(--color-muted);
    }
</style>
