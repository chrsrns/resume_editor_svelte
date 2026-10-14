import { describe, it, expect } from 'vitest';
import { FIELD_LIMITS, checkMaxLen } from './limits';

describe('checkMaxLen', () => {
    it('passes at the limit and fails one over', () => {
        expect(checkMaxLen('Video', 'x'.repeat(500), FIELD_LIMITS.video_url)).toBeNull();
        expect(checkMaxLen('Video', 'x'.repeat(501), FIELD_LIMITS.video_url)).toBe(
            'Video must be 500 characters or less'
        );
    });

    it('trims before measuring', () => {
        expect(checkMaxLen('Company name', '  x  ', FIELD_LIMITS.company_name)).toBeNull();
    });

    it('formats large limits with commas', () => {
        expect(
            checkMaxLen('Job description', 'x'.repeat(20001), FIELD_LIMITS.job_description)
        ).toBe('Job description must be 20,000 characters or less');
        expect(
            checkMaxLen('Executive summary', 'x'.repeat(5001), FIELD_LIMITS.executive_summary)
        ).toBe('Executive summary must be 5,000 characters or less');
    });
});
