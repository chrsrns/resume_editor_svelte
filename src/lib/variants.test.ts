import { describe, expect, it } from 'vitest';
import type { Resume } from './types';
import {
    buildResumeListEntries,
    sortVariants,
    truncateVariants,
    variantPrimaryText
} from './variants';

function resume(overrides: Partial<Resume>): Resume {
    return {
        id: 'r1',
        name: 'Resume',
        profile_image_url: null,
        location: null,
        email: 'test@example.com',
        github_url: null,
        video: null,
        mobile_number: null,
        executive_summary: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: 1,
        visibility: 'public',
        is_variant: false,
        base_resume_id: null,
        show_variant_tag: null,
        company_name: null,
        role_title: null,
        target_date: null,
        target_date_precision: null,
        job_description: null,
        variant_label: null,
        ...overrides
    };
}

describe('resume variant helpers', () => {
    it('builds list entries in GET response order', () => {
        const baseOne = resume({ id: 'b1', name: 'Base One' });
        const baseTwo = resume({ id: 'b2', name: 'Base Two' });
        const variant = resume({ id: 'v1', is_variant: true, base_resume_id: 'b1' });
        const orphan = resume({ id: 'o1', is_variant: true, base_resume_id: null });

        const entries = buildResumeListEntries([baseOne, baseTwo, variant, orphan]);

        expect(entries.map((entry) => (entry.kind === 'group' ? entry.base.id : entry.resume.id))).toEqual([
            'b1', 'b2', 'o1'
        ]);
        expect(entries[0]).toMatchObject({ kind: 'group', base: { id: 'b1' }, variants: [{ id: 'v1' }] });
        expect(entries[1]).toMatchObject({ kind: 'group', base: { id: 'b2' }, variants: [] });
        expect(entries[2]).toMatchObject({ kind: 'orphan', resume: { id: 'o1' } });
    });

    it('uses company then label then name for nested rows', () => {
        expect(
            variantPrimaryText(
                resume({ company_name: 'Acme', variant_label: 'Label', name: 'Name' })
            )
        ).toBe('Acme');
        expect(variantPrimaryText(resume({ variant_label: 'Label', name: 'Name' }))).toBe('Label');
        expect(variantPrimaryText(resume({ name: 'Name' }))).toBe('Name');
    });

    it('sorts target dates by canonical start desc, nulls last, id desc', () => {
        const sorted = sortVariants([
            resume({ id: 'v10', target_date: '2026' }),
            resume({ id: 'v11', target_date: null }),
            resume({ id: 'v12', target_date: '2026-04-02' }),
            resume({ id: 'v13', target_date: '2026-03' }),
            resume({ id: 'v14', target_date: '2026-04-02' })
        ]);

        expect(sorted.map((r) => r.id)).toEqual(['v14', 'v12', 'v13', 'v10', 'v11']);
    });

    it('sorts grouped variants without mutating the GET response order', () => {
        const base = resume({ id: 'b1' });
        const older = resume({ id: 'v1', is_variant: true, base_resume_id: 'b1', target_date: '2025' });
        const newer = resume({ id: 'v2', is_variant: true, base_resume_id: 'b1', target_date: '2026' });
        const response = [base, older, newer];

        const entries = buildResumeListEntries(response);
        const group = entries[0];

        expect(group.kind).toBe('group');
        if (group.kind === 'group') {
            expect(group.variants.map((variant) => variant.id)).toEqual(['v2', 'v1']);
        }
        expect(response.map((r) => r.id)).toEqual(['b1', 'v1', 'v2']);
    });

    it('renders a contradictory non-variant row with a base id as ordinary', () => {
        const base = resume({ id: 'b1', name: 'Base' });
        const contradictory = resume({ id: 'o1', is_variant: false, base_resume_id: 'b1' });

        const entries = buildResumeListEntries([base, contradictory]);

        expect(entries).toHaveLength(2);
        expect(entries[1]).toMatchObject({ kind: 'group', base: { id: 'o1' }, variants: [] });
    });
});

describe('truncateVariants', () => {
    const four = [
        resume({ id: 'v1' }),
        resume({ id: 'v2' }),
        resume({ id: 'v3' }),
        resume({ id: 'v4' })
    ];

    it('returns the first 3 when collapsed', () => {
        expect(truncateVariants(four, false).map((v) => v.id)).toEqual(['v1', 'v2', 'v3']);
    });

    it('returns all rows when expanded', () => {
        expect(truncateVariants(four, true)).toHaveLength(4);
    });

    it('returns short lists unchanged', () => {
        const two = [resume({ id: 'v1' }), resume({ id: 'v2' })];
        expect(truncateVariants(two, false)).toHaveLength(2);
    });
});
