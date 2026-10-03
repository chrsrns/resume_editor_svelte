import { describe, expect, it } from 'vitest';
import { buildBasicsUpdatePayload } from './basicsPayload';

const shared = {
    name: 'Resume',
    profile_image_url: '',
    location: ' Remote ',
    email: 'owner@example.com',
    github_url: '',
    video: '',
    mobile_number: '',
    executive_summary: '',
    is_public: true
};

describe('buildBasicsUpdatePayload', () => {
    it('includes variant metadata and omits email and server-owned fields', () => {
        const payload = buildBasicsUpdatePayload({
            ...shared,
            is_variant: true,
            show_variant_tag: false,
            company_name: ' Acme ',
            role_title: ' Engineer ',
            target_date: '2026-03',
            job_description: ' Build systems ',
            variant_label: ' Platform '
        });

        expect(payload).toMatchObject({
            company_name: 'Acme',
            role_title: 'Engineer',
            target_date: '2026-03',
            job_description: 'Build systems',
            variant_label: 'Platform',
            show_variant_tag: false
        });
        expect(payload).not.toHaveProperty('email');
        expect(payload).not.toHaveProperty('is_variant');
        expect(payload).not.toHaveProperty('base_resume_id');
        expect(payload).not.toHaveProperty('target_date_precision');
    });

    it('keeps email on base resumes and omits variant metadata', () => {
        const payload = buildBasicsUpdatePayload({
            ...shared,
            is_variant: false,
            show_variant_tag: false,
            company_name: 'Acme',
            role_title: 'Engineer',
            target_date: '2026-03',
            job_description: 'Build systems',
            variant_label: 'Platform'
        });

        expect(payload.email).toBe('owner@example.com');
        expect(payload).not.toHaveProperty('company_name');
        expect(payload).not.toHaveProperty('role_title');
        expect(payload).not.toHaveProperty('target_date');
        expect(payload).not.toHaveProperty('job_description');
        expect(payload).not.toHaveProperty('variant_label');
        expect(payload).not.toHaveProperty('show_variant_tag');
    });

    it('normalizes blank metadata and target date to null', () => {
        const payload = buildBasicsUpdatePayload({
            ...shared,
            is_variant: true,
            show_variant_tag: true,
            company_name: '   ',
            role_title: '',
            target_date: '',
            job_description: ' ',
            variant_label: ''
        });

        expect(payload.company_name).toBeNull();
        expect(payload.role_title).toBeNull();
        expect(payload.target_date).toBeNull();
        expect(payload.job_description).toBeNull();
        expect(payload.variant_label).toBeNull();
        expect(payload.show_variant_tag).toBe(true);
    });
});
