/**
 * Draft module for languages with nested frameworks.
 *
 * Thin config + alias layer over `createParentChildSection`.
 */

import type {
    Language,
    Framework,
    NewLanguageRequest,
    UpdateLanguageRequest,
    NewFrameworkRequest,
    UpdateFrameworkRequest
} from '$lib/types';
import {
    createDraftListStore,
    createChildGroupStore,
    createParentChildSection
} from './draftStore.svelte';
import { toNumberOrNull } from './shared';

type LanguageDraft = {
    id: number;
    language_name: string;
    display_order: string;
};

type FrameworkDraft = {
    id: number;
    framework_name: string;
    display_order: string;
};

export type LanguageAction =
    | { type: 'createLanguage'; tempId: number; payload: NewLanguageRequest }
    | { type: 'updateLanguage'; id: number; payload: UpdateLanguageRequest }
    | { type: 'deleteLanguage'; id: number }
    | { type: 'createFramework'; languageId: number; tempId: number; payload: NewFrameworkRequest }
    | { type: 'updateFramework'; id: number; payload: UpdateFrameworkRequest }
    | { type: 'deleteFramework'; id: number };

const languagesStore = createDraftListStore<LanguageDraft, Language>({
    toDraft: (l) => ({
        id: l.id,
        language_name: l.language_name,
        display_order: l.display_order == null ? '' : String(l.display_order)
    }),
    toBaseline: (d, existing, meta) => ({
        id: d.id,
        resume_id: existing?.resume_id ?? meta?.resume_id ?? 0,
        language_name: d.language_name.trim(),
        display_order: toNumberOrNull(d.display_order),
        created_at: existing?.created_at ?? meta?.created_at ?? ''
    }),
    normalizeDraft: (d) => ({ language_name: d.language_name.trim() }),
    normalizeBaseline: (b) => ({ language_name: b.language_name }),
    validate: (d) => {
        if (!d.language_name.trim()) return 'Language name is required';
        return null;
    },
    buildCreatePayload: (d) => ({
        language_name: d.language_name.trim(),
        display_order: toNumberOrNull(d.display_order)
    }),
    buildUpdatePayload: (d, b) => {
        const payload: UpdateLanguageRequest = {};
        if (d.language_name.trim() !== b.language_name) {
            payload.language_name = d.language_name.trim();
        }
        const newOrder = toNumberOrNull(d.display_order);
        if (newOrder !== b.display_order) {
            payload.display_order = newOrder;
        }
        return payload;
    },
    actionType: { create: 'createLanguage', update: 'updateLanguage', delete: 'deleteLanguage' },
    getMeta: (b) => ({ resume_id: b.resume_id, created_at: b.created_at })
});

const frameworksStore = createChildGroupStore<FrameworkDraft, Framework, 'languageId'>({
    toDraft: (f) => ({
        id: f.id,
        framework_name: f.framework_name,
        display_order: f.display_order == null ? '' : String(f.display_order)
    }),
    toBaseline: (d, languageId, existing, meta) => ({
        id: d.id,
        language_id: languageId,
        framework_name: d.framework_name.trim(),
        display_order: toNumberOrNull(d.display_order),
        created_at: existing?.created_at ?? meta?.created_at ?? ''
    }),
    normalizeDraft: (d) => ({ framework_name: d.framework_name.trim() }),
    normalizeBaseline: (b) => ({ framework_name: b.framework_name }),
    validate: (d) => {
        if (!d.framework_name.trim()) return 'Framework name is required';
        return null;
    },
    buildCreatePayload: (d) => ({
        framework_name: d.framework_name.trim(),
        display_order: toNumberOrNull(d.display_order)
    }),
    buildUpdatePayload: (d, b) => {
        const payload: UpdateFrameworkRequest = {};
        if (d.framework_name.trim() !== b.framework_name) {
            payload.framework_name = d.framework_name.trim();
        }
        const newOrder = toNumberOrNull(d.display_order);
        if (newOrder !== b.display_order) {
            payload.display_order = newOrder;
        }
        return payload;
    },
    actionType: { create: 'createFramework', update: 'updateFramework', delete: 'deleteFramework' },
    getParentId: (f) => f.language_id,
    parentIdField: 'languageId',
    getMeta: (f) => ({ created_at: f.created_at })
});

const section = createParentChildSection(
    languagesStore,
    {
        frameworks: { label: 'Framework', store: frameworksStore }
    },
    'Language'
);

export const initialize = (languages: Language[], frameworks: Framework[]): void =>
    section.initialize(languages, { frameworks });

export const getDrafts = languagesStore.getDrafts;
export const getVisibleDrafts = languagesStore.getVisibleDrafts;
export const getBaseline = languagesStore.getBaseline;
export const getBaselineFrameworks = frameworksStore.getBaseline;

export const addLanguage = section.addParent;
export const updateLanguage = languagesStore.update;
export const removeLanguage = section.removeParent;
export const reorder = languagesStore.reorder;

export const validateLanguage = languagesStore.validate;
export const validateFramework = frameworksStore.validateChild;

export const validateAll = section.validateAll;
export const getValidationErrors = section.getValidationErrors;
export const isDirty = section.isDirty;
export const resetToBaseline = section.resetToBaseline;
export const applySaveResults = section.applySaveResults;
export const commitBaseline = section.commitBaseline;

export const addFramework = frameworksStore.addChild;
export const updateFramework = frameworksStore.updateChild;
export const removeFramework = frameworksStore.removeChild;
export const reorderFrameworks = frameworksStore.reorderChildren;

export const getFrameworks = frameworksStore.getChildren;
export const getVisibleFrameworks = frameworksStore.getVisibleChildren;

export const getSaving = languagesStore.getSaving;
export const setSaving = languagesStore.setSaving;
export const getError = languagesStore.getError;
export const setError = languagesStore.setError;

export function computeDiff(): LanguageAction[] {
    return section.computeDiff() as unknown as LanguageAction[];
}
