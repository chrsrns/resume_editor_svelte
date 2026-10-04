import { describe, expect, it } from 'vitest';
import type { Resume } from './types';
import {
    buildResumeListEntries,
    sortVariants,
    variantPrimaryText
} from './variants';

function resume(overrides: Partial<Resume>): Resume {
    return {
        id: 1,
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
        is_public: true,
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
        const baseOne = resume({ id: 1, name: 'Base One' });
        const baseTwo = resume({ id: 2, name: 'Base Two' });
        const variant = resume({ id: 3, is_variant: true, base_resume_id: 1 });
        const orphan = resume({ id: 4, is_variant: true, base_resume_id: null });

        const entries = buildResumeListEntries([baseOne, baseTwo, variant, orphan]);

        expect(entries.map((entry) => (entry.kind === 'group' ? entry.base.id : entry.resume.id))).toEqual([
            1, 2, 4
        ]);
        expect(entries[0]).toMatchObject({ kind: 'group', base: { id: 1 }, variants: [{ id: 3 }] });
        expect(entries[1]).toMatchObject({ kind: 'group', base: { id: 2 }, variants: [] });
        expect(entries[2]).toMatchObject({ kind: 'orphan', resume: { id: 4 } });
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
            resume({ id: 10, target_date: '2026' }),
            resume({ id: 11, target_date: null }),
            resume({ id: 12, target_date: '2026-04-02' }),
            resume({ id: 13, target_date: '2026-03' }),
            resume({ id: 14, target_date: '2026-04-02' })
        ]);

        expect(sorted.map((r) => r.id)).toEqual([14, 12, 13, 10, 11]);
    });

    it('sorts grouped variants without mutating the GET response order', () => {
        const base = resume({ id: 1 });
        const older = resume({ id: 2, is_variant: true, base_resume_id: 1, target_date: '2025' });
        const newer = resume({ id: 3, is_variant: true, base_resume_id: 1, target_date: '2026' });
        const response = [base, older, newer];

        const entries = buildResumeListEntries(response);
        const group = entries[0];

        expect(group.kind).toBe('group');
        if (group.kind === 'group') {
            expect(group.variants.map((variant) => variant.id)).toEqual([3, 2]);
        }
        expect(response.map((r) => r.id)).toEqual([1, 2, 3]);
    });

    it('renders a contradictory non-variant row with a base id as ordinary', () => {
        const base = resume({ id: 1, name: 'Base' });
        const contradictory = resume({ id: 9, is_variant: false, base_resume_id: 1 });

        const entries = buildResumeListEntries([base, contradictory]);

        expect(entries).toHaveLength(2);
        expect(entries[1]).toMatchObject({ kind: 'group', base: { id: 9 }, variants: [] });
    });
});
