import { describe, it, expect } from 'vitest';
import {
    parseRevisionParam,
    revisionActionLabel,
    revisionTimestampToDate,
    formatRevisionTimestamp,
    formatChangeValue,
    snapshotToSections
} from './revisions';
import type { ResumeSnapshot } from './types';

function baseSnapshot(): ResumeSnapshot {
    return {
        schema_version: 1,
        name: 'Snap',
        profile_image_url: null,
        location: null,
        email: 'a@b.c',
        github_url: null,
        mobile_number: null,
        executive_summary: null,
        video: null,
        visibility: 'public',
        company_name: null,
        role_title: null,
        target_date: null,
        target_date_precision: null,
        job_description: null,
        variant_label: null,
        show_variant_tag: false,
        education: [],
        education_key_points: {},
        skills: [],
        work_experiences: [],
        work_experience_key_points: {},
        portfolio_projects: [],
        portfolio_key_points: {},
        portfolio_technologies: {},
        languages: [],
        frameworks: {}
    };
}

describe('parseRevisionParam', () => {
    it('reports closed when the param is absent', () => {
        expect(parseRevisionParam(null)).toEqual({ kind: 'closed' });
    });

    it('selects canonical decimal revisions', () => {
        expect(parseRevisionParam('1')).toEqual({ kind: 'selected', n: 1 });
        expect(parseRevisionParam('42')).toEqual({ kind: 'selected', n: 42 });
        expect(parseRevisionParam('2147483647')).toEqual({ kind: 'selected', n: 2147483647 });
    });

    it('rejects malformed, non-positive, and overflowing values', () => {
        for (const raw of ['0', '-1', '01', '1.5', '0x10', '1e2', '+1', ' 1', '1 ', '', 'abc', '2147483648']) {
            expect(parseRevisionParam(raw), `raw=${JSON.stringify(raw)}`).toEqual({ kind: 'invalid' });
        }
    });
});

describe('revisionActionLabel', () => {
    it('humanizes known wire actions', () => {
        expect(revisionActionLabel('personalinfo')).toBe('Personal info');
        expect(revisionActionLabel('education')).toBe('Education');
        expect(revisionActionLabel('experience')).toBe('Work experience');
        expect(revisionActionLabel('projects')).toBe('Projects');
        expect(revisionActionLabel('skills')).toBe('Skills');
        expect(revisionActionLabel('languages')).toBe('Languages');
        expect(revisionActionLabel('frameworks')).toBe('Frameworks');
    });

    it('returns unknown actions as the raw wire string', () => {
        expect(revisionActionLabel('bogus_action')).toBe('bogus_action');
    });
});

describe('revisionTimestampToDate', () => {
    it('treats a naive timestamp as UTC', () => {
        expect(revisionTimestampToDate('2026-01-01T12:00:00').toISOString()).toBe(
            '2026-01-01T12:00:00.000Z'
        );
        expect(revisionTimestampToDate('2026-01-01 12:00:00').toISOString()).toBe(
            '2026-01-01T12:00:00.000Z'
        );
    });

    it('keeps an explicit offset unchanged', () => {
        expect(revisionTimestampToDate('2026-01-01T12:00:00Z').toISOString()).toBe(
            '2026-01-01T12:00:00.000Z'
        );
        expect(revisionTimestampToDate('2026-01-01T12:00:00+02:00').toISOString()).toBe(
            '2026-01-01T10:00:00.000Z'
        );
    });
});

describe('formatRevisionTimestamp', () => {
    it('renders a readable date and time', () => {
        const out = formatRevisionTimestamp('2026-03-15T08:30:00');
        expect(out).toContain('2026');
        expect(out.length).toBeGreaterThan(5);
    });
});

describe('formatChangeValue', () => {
    it('formats nulls, scalars, and objects', () => {
        expect(formatChangeValue(null)).toBe('null');
        expect(formatChangeValue(undefined)).toBe('null');
        expect(formatChangeValue('abc')).toBe('abc');
        expect(formatChangeValue(42)).toBe('42');
        expect(formatChangeValue(true)).toBe('true');
        expect(formatChangeValue({ a: 1 })).toBe('{"a":1}');
        expect(formatChangeValue([1, 2])).toBe('[1,2]');
    });
});

describe('snapshotToSections', () => {
    it('joins keyed child maps through the parent id', () => {
        const snap = baseSnapshot();
        snap.education = [
            {
                id: 7,
                education_stage: 'BSc',
                institution_name: 'Uni',
                degree: null,
                start_date: '2020-01',
                end_date: null,
                description: null,
                display_order: 1,
                active: true
            }
        ];
        snap.education_key_points = {
            '7': [{ id: 11, key_point: 'Honors', display_order: 1, active: true }]
        };

        const sections = snapshotToSections(snap);
        expect(sections.educations).toHaveLength(1);
        expect(sections.educations[0].keyPoints.map((k) => k.key_point)).toEqual(['Honors']);
    });

    it('tolerates a missing map key and a missing map field', () => {
        const snap = baseSnapshot();
        snap.education = [
            {
                id: 7,
                education_stage: 'BSc',
                institution_name: 'Uni',
                degree: null,
                start_date: '2020-01',
                end_date: null,
                description: null,
                display_order: 1,
                active: true
            }
        ];
        snap.education_key_points = { '999': [{ id: 1, key_point: 'orphan', display_order: null, active: true }] };

        expect(snapshotToSections(snap).educations[0].keyPoints).toEqual([]);

        const older = baseSnapshot() as Partial<ResumeSnapshot>;
        delete older.education_key_points;
        expect(snapshotToSections(older as ResumeSnapshot).educations).toEqual([]);
    });

    it('sorts rows by display_order and preserves wire order when it is absent', () => {
        const snap = baseSnapshot();
        snap.skills = [
            { id: 2, skill_name: 'B', confidence_percentage: 50, display_order: 2 },
            { id: 1, skill_name: 'A', confidence_percentage: 90, display_order: 1 }
        ];
        expect(snapshotToSections(snap).skills.map((s) => s.skill_name)).toEqual(['A', 'B']);

        const wire = baseSnapshot();
        wire.skills = [
            { id: 9, skill_name: 'First', confidence_percentage: 1, display_order: null },
            { id: 3, skill_name: 'Second', confidence_percentage: 1, display_order: null }
        ];
        expect(snapshotToSections(wire).skills.map((s) => s.skill_name)).toEqual([
            'First',
            'Second'
        ]);
    });

    it('joins portfolio key points and technologies per project', () => {
        const snap = baseSnapshot();
        snap.portfolio_projects = [
            {
                id: 5,
                project_name: 'P',
                image_url: null,
                project_link: null,
                source_code_link: null,
                video_url: null,
                description: null,
                display_order: null,
                active: true
            }
        ];
        snap.portfolio_key_points = { '5': [{ id: 1, key_point: 'kp', display_order: null, active: true }] };
        snap.portfolio_technologies = {
            '5': [{ id: 2, technology_name: 'Svelte', display_order: null, active: true }]
        };
        snap.languages = [{ id: 8, language_name: 'ts', display_order: null }];
        snap.frameworks = { '8': [{ id: 3, framework_name: 'vitest', display_order: null }] };

        const sections = snapshotToSections(snap);
        expect(sections.portfolioProjects[0].keyPoints[0].key_point).toBe('kp');
        expect(sections.portfolioProjects[0].technologies[0].technology_name).toBe('Svelte');
        expect(sections.languages[0].frameworks[0].framework_name).toBe('vitest');
    });
});
