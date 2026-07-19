import { describe, it, expect } from 'vitest';
import {
    parsePartialDate,
    formatPartialDate,
    getPartialDatePrecision,
    validatePartialDate,
    isPartialDateRangeValid,
    getDaysInMonth
} from './types';

describe('parsePartialDate', () => {
    it('parses empty string', () => {
        expect(parsePartialDate('')).toEqual({ year: '', month: '', day: '' });
    });

    it('parses year-only', () => {
        expect(parsePartialDate('2020')).toEqual({ year: '2020', month: '', day: '' });
    });

    it('parses month-year with leading zeros', () => {
        expect(parsePartialDate('2020-06')).toEqual({ year: '2020', month: '6', day: '' });
    });

    it('parses full date with leading zeros', () => {
        expect(parsePartialDate('2020-06-15')).toEqual({ year: '2020', month: '6', day: '15' });
    });
});

describe('formatPartialDate', () => {
    it('formats year-only', () => {
        expect(formatPartialDate({ year: '2020', month: '', day: '' })).toBe('2020');
    });

    it('formats month-year with padding', () => {
        expect(formatPartialDate({ year: '2020', month: '6', day: '' })).toBe('2020-06');
    });

    it('formats full date with padding', () => {
        expect(formatPartialDate({ year: '2020', month: '6', day: '5' })).toBe('2020-06-05');
    });

    it('returns empty when year missing', () => {
        expect(formatPartialDate({ year: '', month: '6', day: '5' })).toBe('');
    });
});

describe('getPartialDatePrecision', () => {
    it('returns null for no year', () => {
        expect(getPartialDatePrecision({ year: '', month: '', day: '' })).toBeNull();
    });

    it('returns year precision', () => {
        expect(getPartialDatePrecision({ year: '2020', month: '', day: '' })).toBe('year');
    });

    it('returns month precision', () => {
        expect(getPartialDatePrecision({ year: '2020', month: '6', day: '' })).toBe('month');
    });

    it('returns day precision', () => {
        expect(getPartialDatePrecision({ year: '2020', month: '6', day: '15' })).toBe('day');
    });
});

describe('getDaysInMonth', () => {
    it('returns 31 for January', () => {
        expect(getDaysInMonth('2020', '1')).toBe(31);
    });

    it('returns 29 for leap February', () => {
        expect(getDaysInMonth('2020', '2')).toBe(29);
    });

    it('returns 28 for non-leap February', () => {
        expect(getDaysInMonth('2021', '2')).toBe(28);
    });

    it('returns 30 for April', () => {
        expect(getDaysInMonth('2020', '4')).toBe(30);
    });
});

describe('validatePartialDate', () => {
    it('validates year-only', () => {
        expect(validatePartialDate({ year: '2020', month: '', day: '' })).toBeNull();
    });

    it('validates month-year', () => {
        expect(validatePartialDate({ year: '2020', month: '6', day: '' })).toBeNull();
    });

    it('validates full date', () => {
        expect(validatePartialDate({ year: '2020', month: '6', day: '15' })).toBeNull();
    });

    it('rejects missing year', () => {
        expect(validatePartialDate({ year: '', month: '6', day: '15' })).toBe('Year is required');
    });

    it('rejects day without month', () => {
        expect(validatePartialDate({ year: '2020', month: '', day: '15' })).toBe(
            'Month is required when day is selected'
        );
    });

    it('rejects invalid day for month', () => {
        expect(validatePartialDate({ year: '2020', month: '4', day: '31' })).toBe('Day is invalid');
    });

    it('rejects leap day on non-leap year', () => {
        expect(validatePartialDate({ year: '2021', month: '2', day: '29' })).toBe('Day is invalid');
    });
});

describe('isPartialDateRangeValid', () => {
    it('is valid when end is empty', () => {
        expect(isPartialDateRangeValid('2020', null)).toBe(true);
    });

    it('is valid when end is same year', () => {
        expect(isPartialDateRangeValid('2020', '2020')).toBe(true);
    });

    it('is valid when end is later year', () => {
        expect(isPartialDateRangeValid('2020', '2021')).toBe(true);
    });

    it('rejects end before start', () => {
        expect(isPartialDateRangeValid('2021', '2020')).toBe(false);
    });

    it('rejects end month before start month same year', () => {
        expect(isPartialDateRangeValid('2020-06', '2020-05')).toBe(false);
    });

    it('rejects end day before start day same month', () => {
        expect(isPartialDateRangeValid('2020-06-15', '2020-06-14')).toBe(false);
    });

    it('allows year ranges with mismatched precision', () => {
        expect(isPartialDateRangeValid('2020-06', '2021')).toBe(true);
    });
});
