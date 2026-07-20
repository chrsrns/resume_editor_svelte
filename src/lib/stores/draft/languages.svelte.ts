/**
 * Draft module for languages with nested frameworks.
 *
 * This is now a thin composition layer over `createDraftListStore` (languages)
 * and `createChildGroupStore` (frameworks).
 */

import type {
    Language,
    Framework,
    NewLanguageRequest,
    UpdateLanguageRequest,
    NewFrameworkRequest,
    UpdateFrameworkRequest
} from '$lib/types';
import { createDraftListStore, createChildGroupStore } from './draftStore.svelte';
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

export function initialize(languages: Language[], frameworks: Framework[]): void {
    languagesStore.initialize(languages);
    frameworksStore.initialize(frameworks);
}

export const getDrafts = languagesStore.getDrafts;
export const getVisibleDrafts = languagesStore.getVisibleDrafts;
export const getBaseline = languagesStore.getBaseline;
export const getBaselineFrameworks = frameworksStore.getBaseline;

export function addLanguage(draft: Omit<LanguageDraft, 'id' | 'display_order'>): void {
    const id = languagesStore.add(draft);
    frameworksStore.addGroup(id);
}

export const updateLanguage = languagesStore.update;

export function removeLanguage(id: number): void {
    languagesStore.remove(id);
    if (id < 0) {
        frameworksStore.removeGroup(id);
    } else {
        frameworksStore.removeAllInGroup(id);
    }
}

export const reorder = languagesStore.reorder;

export function validateLanguage(id: number): boolean {
    return languagesStore.validate(id);
}

export function validateFramework(id: number): boolean {
    return frameworksStore.validateChild(id);
}

export function validateAll(): boolean {
    return languagesStore.validateAll() && frameworksStore.validateAll();
}

export function getValidationErrors(): string[] {
    return [...languagesStore.getValidationErrors(), ...frameworksStore.getValidationErrors()];
}

export function isDirty(): boolean {
    return languagesStore.isDirty() || frameworksStore.isDirty();
}

export function resetToBaseline(): void {
    languagesStore.resetToBaseline();
    frameworksStore.resetToBaseline();
}

export function applySaveResults(tempIdMap: Map<number, number>): void {
    languagesStore.applySaveResults(tempIdMap);
    frameworksStore.applySaveResults(tempIdMap);
}

export function commitBaseline(): void {
    languagesStore.commitBaseline();
    frameworksStore.commitBaseline();
}

export function addFramework(
    languageId: number,
    draft: Omit<FrameworkDraft, 'id' | 'display_order'>
): void {
    frameworksStore.addChild(languageId, draft);
}

export const updateFramework = frameworksStore.updateChild;
export const removeFramework = frameworksStore.removeChild;
export const reorderFrameworks = frameworksStore.reorderChildren;
export const getVisibleFrameworks = frameworksStore.getVisibleChildren;
export const getFrameworks = frameworksStore.getChildren;

export const getSaving = languagesStore.getSaving;
export const setSaving = languagesStore.setSaving;
export const getError = languagesStore.getError;
export const setError = languagesStore.setError;

export function computeDiff(): LanguageAction[] {
    return [
        ...languagesStore.computeDiff(),
        ...frameworksStore.computeDiff()
    ] as unknown as LanguageAction[];
}
