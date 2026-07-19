<script lang="ts">
    import { parsePartialDate, formatPartialDate, getDaysInMonth } from '$lib/types';
    import type { PartialDate } from '$lib/types';

    let {
        value = '',
        label,
        title,
        oninput,
        disabled = false
    } = $props<{
        value?: string;
        label?: string;
        title?: string;
        oninput?: (value: string) => void;
        disabled?: boolean;
    }>();

    let selected = $state<PartialDate>({ year: '', month: '', day: '' });

    $effect(() => {
        selected = parsePartialDate(value);
    });

    const currentYear = new Date().getFullYear();
    const years = Array.from(
        { length: currentYear + 10 - 1900 + 1 },
        (_, i) => String(1900 + i)
    );
    const months = Array.from({ length: 12 }, (_, i) => String(i + 1));

    const maxDay = $derived(
        selected.year && selected.month ? getDaysInMonth(selected.year, selected.month) : 31
    );
    const days = $derived(Array.from({ length: maxDay }, (_, i) => String(i + 1)));

    function clampDay(next: { year: string; month: string; day: string }) {
        if (next.year && next.month && next.day) {
            const max = getDaysInMonth(next.year, next.month);
            if (Number(next.day) > max) {
                next.day = String(max);
            }
        }
        return next;
    }

    function emit() {
        oninput?.(formatPartialDate(selected));
    }

    function handleYear(year: string) {
        if (!year) {
            selected = { year: '', month: '', day: '' };
        } else {
            selected = clampDay({ ...selected, year, month: selected.month, day: selected.day });
        }
        emit();
    }

    function handleMonth(month: string) {
        if (!month) {
            selected = { ...selected, month: '', day: '' };
        } else {
            selected = clampDay({ ...selected, month, day: selected.day });
        }
        emit();
    }

    function handleDay(day: string) {
        selected = { ...selected, day };
        emit();
    }
</script>

<div class="partialDate" {title}>
    {#if label}
        <span class="labelText">{label}</span>
    {/if}
    <div class="selects">
        <select
            aria-label="{label ? `${label} year` : 'Year'}"
            class="select"
            {disabled}
            value={selected.year}
            onchange={(e) => handleYear((e.currentTarget as HTMLSelectElement).value)}
        >
            <option value="">Year</option>
            {#each years as y (y)}
                <option value={y}>{y}</option>
            {/each}
        </select>
        <select
            aria-label="{label ? `${label} month` : 'Month'}"
            class="select"
            disabled={disabled || !selected.year}
            value={selected.month}
            onchange={(e) => handleMonth((e.currentTarget as HTMLSelectElement).value)}
        >
            <option value="">Month</option>
            {#each months as m (m)}
                <option value={m}>{m}</option>
            {/each}
        </select>
        <select
            aria-label="{label ? `${label} day` : 'Day'}"
            class="select"
            disabled={disabled || !selected.month}
            value={selected.day}
            onchange={(e) => handleDay((e.currentTarget as HTMLSelectElement).value)}
        >
            <option value="">Day</option>
            {#each days as d (d)}
                <option value={d}>{d}</option>
            {/each}
        </select>
    </div>
</div>

<style>
    .partialDate {
        display: flex;
        flex-direction: column;
        gap: 6px;
        flex: 0 1 auto;
        min-width: max-content;
    }

    .labelText {
        font-size: 12px;
        color: var(--color-muted);
    }

    .selects {
        display: flex;
        gap: var(--space-2);
    }

    .select {
        flex: 0 1 auto;
        min-width: max-content;
        padding: 10px 8px;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        background: var(--color-surface);
        color: var(--color-text);
        font-size: 14px;
    }

    .select:disabled {
        opacity: 0.6;
    }

    .select:focus-visible {
        outline: 2px solid var(--color-primary);
        outline-offset: 2px;
    }
</style>
