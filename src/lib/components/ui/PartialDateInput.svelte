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

    const selected = $derived(parsePartialDate(value));

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: currentYear + 10 - 1900 + 1 }, (_, i) => String(1900 + i));
    const MONTH_NAMES = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December'
    ];
    const months = Array.from({ length: 12 }, (_, i) => ({
        value: String(i + 1),
        label: MONTH_NAMES[i]
    }));

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

    function emit(next: PartialDate) {
        oninput?.(formatPartialDate(clampDay(next)));
    }

    function handleYear(year: string) {
        if (!year) {
            emit({ year: '', month: '', day: '' });
        } else {
            emit({ year, month: selected.month, day: selected.day });
        }
    }

    function handleMonth(month: string) {
        if (!month) {
            emit({ year: selected.year, month: '', day: '' });
        } else {
            emit({ year: selected.year, month, day: selected.day });
        }
    }

    function handleDay(day: string) {
        emit({ year: selected.year, month: selected.month, day });
    }
</script>

<div
    class="partialDate"
    class:disabled
    data-field-width="content"
    {title}
    role={label ? 'group' : undefined}
    aria-label={label}
>
    {#if label}
        <span class="labelText">{label}</span>
    {/if}
    <select
        aria-label={label ? `${label} year` : 'Year'}
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
        aria-label={label ? `${label} month` : 'Month'}
        class="select"
        disabled={disabled || !selected.year}
        value={selected.month}
        onchange={(e) => handleMonth((e.currentTarget as HTMLSelectElement).value)}
    >
        <option value="">Month</option>
        {#each months as m (m.value)}
            <option value={m.value}>{m.label}</option>
        {/each}
    </select>
    <select
        aria-label={label ? `${label} day` : 'Day'}
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

<style>
    .partialDate {
        position: relative;
        display: flex;
        align-items: stretch;
        box-sizing: border-box;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        background: var(--color-surface);
    }

    .partialDate.disabled {
        opacity: 0.6;
    }

    .partialDate.disabled .select:disabled {
        opacity: 1;
    }

    .labelText {
        position: absolute;
        top: calc(-1 * var(--space-2));
        left: var(--space-3);
        padding: 0 var(--space-1);
        font-size: 11px;
        color: var(--color-muted);
        background: var(--color-surface);
        pointer-events: none;
        z-index: 1;
    }

    .select {
        flex: 0 1 auto;
        min-width: max-content;
        padding: var(--space-2-5) calc(var(--space-6) + var(--space-1)) var(--space-2-5) var(--space-3);
        border: none;
        border-right: 1px solid var(--color-border);
        border-radius: 0;
        background: transparent;
        color: var(--color-text);
        box-sizing: border-box;
        cursor: pointer;
    }

    .select:last-child {
        border-right: none;
    }

    .select:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .select:hover:not(:disabled):not(:focus-visible) {
        background: var(--color-background);
    }

    .select:focus-visible {
        outline: 2px solid var(--color-primary);
        outline-offset: 2px;
    }
</style>
