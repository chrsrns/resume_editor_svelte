/**
 * Draft module for resume basics (name, email, profile image, etc.).
 *
 * This module manages the draft state for the core resume fields,
 * which are edited in the Basics tab of the edit page.
 */

import type { Resume, UpdateResumeRequest } from '$lib/types';
import { type DraftItem, computeSignature, setValidationError } from './shared';

/**
 * Draft data shape for resume basics.
 * All fields are strings (not null) for easier form binding.
 */
type BasicsDraft = {
    id: number;
    name: string;
    email: string;
    profile_image_url: string;
    location: string;
    github_url: string;
    mobile_number: string;
    executive_summary: string;
    is_public: boolean;
};

/**
 * Baseline data shape (matches server response with nullable fields).
 */
type BaselineBasics = {
    id: number;
    name: string;
    email: string;
    profile_image_url: string | null;
    location: string | null;
    github_url: string | null;
    mobile_number: string | null;
    executive_summary: string | null;
    is_public: boolean;
};

// State
let baseline: BaselineBasics;
let draft = $state<DraftItem<BasicsDraft>>({
    id: 0,
    name: '',
    email: '',
    profile_image_url: '',
    location: '',
    github_url: '',
    mobile_number: '',
    executive_summary: '',
    is_public: false,
    _status: 'existing'
});
let saving = $state(false);
let error = $state<string | null>(null);

/**
 * Initialize the draft module with server data.
 *
 * @param resume - The resume data from the server
 */
export function initialize(resume: Resume): void {
    baseline = {
        id: resume.id,
        name: resume.name,
        email: resume.email,
        profile_image_url: resume.profile_image_url,
        location: resume.location,
        github_url: resume.github_url,
        mobile_number: resume.mobile_number,
        executive_summary: resume.executive_summary ?? null,
        is_public: resume.is_public
    };
    draft = {
        id: resume.id,
        _status: 'existing',
        name: resume.name,
        email: resume.email,
        profile_image_url: resume.profile_image_url ?? '',
        location: resume.location ?? '',
        github_url: resume.github_url ?? '',
        mobile_number: resume.mobile_number ?? '',
        executive_summary: resume.executive_summary ?? '',
        is_public: resume.is_public
    };
}

/**
 * Get the current draft data.
 */
export function getDraft(): DraftItem<BasicsDraft> {
    return draft;
}

/**
 * Get a specific field value from the draft.
 */
export function getField<K extends keyof BasicsDraft>(field: K): BasicsDraft[K] {
    return draft[field];
}

/**
 * Set a specific field value in the draft.
 */
export function setField<K extends keyof BasicsDraft>(field: K, value: BasicsDraft[K]): void {
    draft = { ...draft, [field]: value };
}

/**
 * Validate the draft data.
 * Returns true if valid, false otherwise.
 * Sets _validationError on the draft if invalid.
 */
export function validate(): boolean {
    let valid = true;

    // Name required
    if (!draft.name.trim()) {
        draft = setValidationError(draft, 'Name is required');
        valid = false;
    }

    // Email required and valid format
    if (!draft.email.trim()) {
        draft = setValidationError(draft, 'Email is required');
        valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) {
        draft = setValidationError(draft, 'Invalid email format');
        valid = false;
    }

    // Executive summary max length
    if (draft.executive_summary.trim().length > 5000) {
        draft = setValidationError(draft, 'Executive summary must be 5,000 characters or less');
        valid = false;
    }

    if (valid) {
        draft = setValidationError(draft, null);
    }

    return valid;
}

/**
 * Get the validation error, if any.
 */
export function getValidationError(): string | null {
    return draft._validationError ?? null;
}

/**
 * Check if the draft has unsaved changes compared to the baseline.
 */
export function isDirty(): boolean {
    const sig = computeSignature({
        id: draft.id,
        name: draft.name.trim(),
        email: draft.email.trim(),
        profile_image_url: draft.profile_image_url.trim() || null,
        location: draft.location.trim() || null,
        github_url: draft.github_url.trim() || null,
        mobile_number: draft.mobile_number.trim() || null,
        executive_summary: draft.executive_summary.trim() || null,
        is_public: draft.is_public
    });
    return sig !== computeSignature(baseline);
}

/**
 * Reset the draft to the baseline server data.
 */
export function resetToBaseline(): void {
    draft = {
        id: baseline.id,
        _status: 'existing',
        name: baseline.name,
        email: baseline.email,
        profile_image_url: baseline.profile_image_url ?? '',
        location: baseline.location ?? '',
        github_url: baseline.github_url ?? '',
        mobile_number: baseline.mobile_number ?? '',
        executive_summary: baseline.executive_summary ?? '',
        is_public: baseline.is_public
    };
    error = null;
}

/**
 * Set the saving state.
 */
export function setSaving(value: boolean): void {
    saving = value;
}

/**
 * Get the current saving state.
 */
export function getSaving(): boolean {
    return saving;
}

/**
 * Set an error message.
 */
export function setError(value: string | null): void {
    error = value;
}

/**
 * Get the current error message.
 */
export function getError(): string | null {
    return error;
}

/**
 * Convert the draft to an UpdateResumeRequest payload.
 */
export function toUpdatePayload(): UpdateResumeRequest {
    return {
        name: draft.name.trim(),
        email: draft.email.trim(),
        profile_image_url: draft.profile_image_url.trim() || null,
        location: draft.location.trim() || null,
        github_url: draft.github_url.trim() || null,
        mobile_number: draft.mobile_number.trim() || null,
        executive_summary: draft.executive_summary.trim() || null,
        is_public: draft.is_public
    };
}

/**
 * Commit the current draft state to the baseline after a successful save.
 */
export function commitBaseline(): void {
    baseline = {
        id: draft.id,
        name: draft.name,
        email: draft.email,
        profile_image_url: draft.profile_image_url.trim() || null,
        location: draft.location.trim() || null,
        github_url: draft.github_url.trim() || null,
        mobile_number: draft.mobile_number.trim() || null,
        executive_summary: draft.executive_summary.trim() || null,
        is_public: draft.is_public
    };
    draft = { ...draft, _status: 'existing' };
}
