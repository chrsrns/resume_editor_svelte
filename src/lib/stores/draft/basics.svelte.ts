/**
 * Draft module for resume basics (name, email, profile image, etc.).
 *
 * This is now a thin configuration layer over `createDraftItemStore`.
 */

import type { Resume, UpdateResumeRequest } from '$lib/types';
import { createDraftItemStore } from './draftStore.svelte';

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
        is_public: b.is_public
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
        is_public: d.is_public
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
        is_public: d.is_public
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
        is_public: b.is_public
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

        return null;
    },
    buildPayload: (d) => ({
        name: d.name.trim(),
        email: d.email.trim(),
        profile_image_url: d.profile_image_url.trim() || null,
        location: d.location.trim() || null,
        github_url: d.github_url.trim() || null,
        video: d.video.trim() || null,
        mobile_number: d.mobile_number.trim() || null,
        executive_summary: d.executive_summary.trim() || null,
        is_public: d.is_public
    })
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
        is_public: resume.is_public
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
