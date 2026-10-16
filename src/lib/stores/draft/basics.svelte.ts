/**
 * Draft module for resume basics (name, email, profile image, etc.).
 *
 * This is now a thin configuration layer over `createDraftItemStore`.
 */

import type { Resume, UpdateResumeRequest, Visibility } from '$lib/types';
import { createDraftItemStore } from './draftStore.svelte';
import { buildBasicsUpdatePayload } from './basicsPayload';
import { defineFields } from './fields';
import { FIELD_LIMITS, checkMaxLen } from '$lib/limits';

type BasicsDraft = {
    id: string;
    name: string;
    email: string;
    profile_image_url: string;
    location: string;
    github_url: string;
    video: string;
    mobile_number: string;
    executive_summary: string;
    visibility: Visibility;
    is_variant: boolean;
    show_variant_tag: boolean;
    company_name: string;
    role_title: string;
    target_date: string;
    job_description: string;
    variant_label: string;
};

type BaselineBasics = {
    id: string;
    name: string;
    email: string;
    profile_image_url: string | null;
    location: string | null;
    github_url: string | null;
    video: string | null;
    mobile_number: string | null;
    executive_summary: string | null;
    visibility: Visibility;
    is_variant: boolean;
    show_variant_tag: boolean | null;
    company_name: string | null;
    role_title: string | null;
    target_date: string | null;
    job_description: string | null;
    variant_label: string | null;
};

const basicsFields = defineFields<BasicsDraft, BaselineBasics>()({
    name: { kind: 'required-trim' },
    email: { kind: 'required-trim' },
    profile_image_url: { kind: 'optional-nullable' },
    location: { kind: 'optional-nullable' },
    github_url: { kind: 'optional-nullable' },
    video: { kind: 'optional-nullable' },
    mobile_number: { kind: 'optional-nullable' },
    executive_summary: { kind: 'optional-nullable' },
    visibility: { kind: 'required-raw' },
    is_variant: { kind: 'bool' },
    show_variant_tag: { kind: 'bool-optional' },
    company_name: { kind: 'optional-nullable' },
    role_title: { kind: 'optional-nullable' },
    target_date: { kind: 'optional-nullable' },
    job_description: { kind: 'optional-nullable' },
    variant_label: { kind: 'optional-nullable' }
});

const store = createDraftItemStore<BasicsDraft, BaselineBasics>({
    toDraft: (b) => ({
        id: b.id,
        ...basicsFields.toDraft(b)
    }),
    toBaseline: (d) => ({
        id: d.id,
        ...basicsFields.toBaseline(d)
    }),
    normalizeDraft: basicsFields.normalizeDraft,
    normalizeBaseline: basicsFields.normalizeBaseline,
    validate: (d) => {
        if (!d.name.trim()) {
            return 'Name is required';
        }

        if (!d.email.trim()) {
            return 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) {
            return 'Invalid email format';
        }

        const lenError =
            checkMaxLen('Executive summary', d.executive_summary, FIELD_LIMITS.executive_summary) ??
            checkMaxLen('Video', d.video, FIELD_LIMITS.video_url);
        if (lenError) {
            return lenError;
        }

        if (d.is_variant) {
            const variantLenError =
                checkMaxLen('Company name', d.company_name, FIELD_LIMITS.company_name) ??
                checkMaxLen('Role title', d.role_title, FIELD_LIMITS.role_title) ??
                checkMaxLen('Variant label', d.variant_label, FIELD_LIMITS.variant_label) ??
                checkMaxLen('Job description', d.job_description, FIELD_LIMITS.job_description);
            if (variantLenError) {
                return variantLenError;
            }
            if (
                d.target_date.trim() &&
                !/^\d{4}(-\d{2}(-\d{2})?)?$/.test(d.target_date.trim())
            ) {
                return 'Target date must be YYYY, YYYY-MM, or YYYY-MM-DD';
            }
        }

        return null;
    },
    buildPayload: buildBasicsUpdatePayload
});

export function initialize(resume: Resume): void {
    const baseline: BaselineBasics = {
        id: resume.id,
        name: resume.name,
        email: resume.email,
        profile_image_url: resume.profile_image_url,
        location: resume.location,
        github_url: resume.github_url,
        video: resume.video ?? null,
        mobile_number: resume.mobile_number,
        executive_summary: resume.executive_summary ?? null,
        visibility: resume.visibility,
        is_variant: resume.is_variant,
        show_variant_tag: resume.show_variant_tag,
        company_name: resume.company_name,
        role_title: resume.role_title,
        target_date: resume.target_date,
        job_description: resume.job_description,
        variant_label: resume.variant_label
    };
    store.initialize(baseline);
}

export const getDraft = store.getDraft;

export function getField<K extends keyof BasicsDraft>(field: K): BasicsDraft[K] {
    return store.getField(field);
}

export function setField<K extends keyof BasicsDraft>(field: K, value: BasicsDraft[K]): void {
    store.update({ [field]: value } as Partial<BasicsDraft>);
}

export const validate = store.validate;
export const getValidationError = store.getValidationError;
export const isDirty = store.isDirty;
export const resetToBaseline = store.resetToBaseline;

export function toUpdatePayload(): UpdateResumeRequest {
    return store.buildPayload() as UpdateResumeRequest;
}

export const commitBaseline = store.commitBaseline;
export const getSaving = store.getSaving;
export const setSaving = store.setSaving;
export const getError = store.getError;
export const setError = store.setError;
