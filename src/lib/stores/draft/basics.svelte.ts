/**
 * Draft module for resume basics (name, email, profile image, etc.).
 *
 * This is now a thin configuration layer over `createDraftItemStore`.
 */

import type { Resume, UpdateResumeRequest } from '$lib/types';
import { createDraftItemStore } from './draftStore.svelte';
import { buildBasicsUpdatePayload } from './basicsPayload';

type BasicsDraft = {
    id: number;
    name: string;
    email: string;
    profile_image_url: string;
    location: string;
    github_url: string;
    video: string;
    mobile_number: string;
    executive_summary: string;
    is_public: boolean;
    is_variant: boolean;
    show_variant_tag: boolean;
    company_name: string;
    role_title: string;
    target_date: string;
    job_description: string;
    variant_label: string;
};

type BaselineBasics = {
    id: number;
    name: string;
    email: string;
    profile_image_url: string | null;
    location: string | null;
    github_url: string | null;
    video: string | null;
    mobile_number: string | null;
    executive_summary: string | null;
    is_public: boolean;
    is_variant: boolean;
    show_variant_tag: boolean | null;
    company_name: string | null;
    role_title: string | null;
    target_date: string | null;
    job_description: string | null;
    variant_label: string | null;
};

const store = createDraftItemStore<BasicsDraft, BaselineBasics>({
    toDraft: (b) => ({
        id: b.id,
        name: b.name,
        email: b.email,
        profile_image_url: b.profile_image_url ?? '',
        location: b.location ?? '',
        github_url: b.github_url ?? '',
        video: b.video ?? '',
        mobile_number: b.mobile_number ?? '',
        executive_summary: b.executive_summary ?? '',
        is_public: b.is_public,
        is_variant: b.is_variant,
        show_variant_tag: b.show_variant_tag ?? false,
        company_name: b.company_name ?? '',
        role_title: b.role_title ?? '',
        target_date: b.target_date ?? '',
        job_description: b.job_description ?? '',
        variant_label: b.variant_label ?? ''
    }),
    toBaseline: (d) => ({
        id: d.id,
        name: d.name.trim(),
        email: d.email.trim(),
        profile_image_url: d.profile_image_url.trim() || null,
        location: d.location.trim() || null,
        github_url: d.github_url.trim() || null,
        video: d.video.trim() || null,
        mobile_number: d.mobile_number.trim() || null,
        executive_summary: d.executive_summary.trim() || null,
        is_public: d.is_public,
        is_variant: d.is_variant,
        show_variant_tag: d.show_variant_tag,
        company_name: d.company_name.trim() || null,
        role_title: d.role_title.trim() || null,
        target_date: d.target_date.trim() || null,
        job_description: d.job_description.trim() || null,
        variant_label: d.variant_label.trim() || null
    }),
    normalizeDraft: (d) => ({
        name: d.name.trim(),
        email: d.email.trim(),
        profile_image_url: d.profile_image_url.trim() || null,
        location: d.location.trim() || null,
        github_url: d.github_url.trim() || null,
        video: d.video.trim() || null,
        mobile_number: d.mobile_number.trim() || null,
        executive_summary: d.executive_summary.trim() || null,
        is_public: d.is_public,
        is_variant: d.is_variant,
        show_variant_tag: d.show_variant_tag,
        company_name: d.company_name.trim() || null,
        role_title: d.role_title.trim() || null,
        target_date: d.target_date.trim() || null,
        job_description: d.job_description.trim() || null,
        variant_label: d.variant_label.trim() || null
    }),
    normalizeBaseline: (b) => ({
        name: b.name,
        email: b.email,
        profile_image_url: b.profile_image_url,
        location: b.location,
        github_url: b.github_url,
        video: b.video,
        mobile_number: b.mobile_number,
        executive_summary: b.executive_summary,
        is_public: b.is_public,
        is_variant: b.is_variant,
        show_variant_tag: b.show_variant_tag ?? false,
        company_name: b.company_name,
        role_title: b.role_title,
        target_date: b.target_date,
        job_description: b.job_description,
        variant_label: b.variant_label
    }),
    validate: (d) => {
        if (!d.name.trim()) {
            return 'Name is required';
        }

        if (!d.email.trim()) {
            return 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) {
            return 'Invalid email format';
        }

        if (d.executive_summary.trim().length > 5000) {
            return 'Executive summary must be 5,000 characters or less';
        }

        if (d.video.trim().length > 500) {
            return 'Video must be 500 characters or less';
        }

        if (d.is_variant) {
            if (d.company_name.trim().length > 255) {
                return 'Company name must be 255 characters or less';
            }
            if (d.role_title.trim().length > 255) {
                return 'Role title must be 255 characters or less';
            }
            if (d.variant_label.trim().length > 255) {
                return 'Variant label must be 255 characters or less';
            }
            if (d.job_description.trim().length > 20000) {
                return 'Job description must be 20,000 characters or less';
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
        is_public: resume.is_public,
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
