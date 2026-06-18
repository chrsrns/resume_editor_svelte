/**
 * Draft module for languages with nested frameworks.
 *
 * This module manages the draft state for the languages section,
 * which includes language entries and their nested frameworks.
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
    type DraftItem,
    type DraftStatus,
    generateTempId,
    computeSignature,
    setValidationError,
    toNumberOrNull,
    toNullable
} from './shared';
import { byDisplayOrder } from '$lib/components/sections/shared/displayOrderReorder';

/**
 * Draft data shape for a language entry.
 * All fields are strings for easier form binding.
 */
type LanguageDraft = {
    id: number;
    language_name: string;
    display_order: string;
};

/**
 * Draft data shape for a framework.
 */
type FrameworkDraft = {
    id: number;
    framework_name: string;
    display_order: string;
};

/**
 * Baseline data shape (matches server response).
 */
type BaselineLanguage = Language;
type BaselineFramework = Framework;

/**
 * Action type for save orchestrator.
 */
export type LanguageAction =
    | { type: 'createLanguage'; tempId: number; payload: NewLanguageRequest }
    | { type: 'updateLanguage'; id: number; payload: UpdateLanguageRequest }
    | { type: 'deleteLanguage'; id: number }
    | { type: 'createFramework'; languageId: number; tempId: number; payload: NewFrameworkRequest }
    | { type: 'updateFramework'; id: number; payload: UpdateFrameworkRequest }
    | { type: 'deleteFramework'; id: number };

/**
 * Result of a save operation.
 */
export type LanguageActionResult = {
    action: LanguageAction;
    success: boolean;
    realId?: number;
    error?: string;
};

// State
let baselineLanguages: BaselineLanguage[] = [];
let baselineFrameworks: BaselineFramework[] = [];
let drafts = $state<DraftItem<LanguageDraft>[]>([]);
let frameworks = $state<Record<number, DraftItem<FrameworkDraft>[]>>({});
let saving = $state(false);
let error = $state<string | null>(null);

/**
 * Initialize the draft module with server data.
 *
 * @param languages - The language data from the server
 * @param frameworkList - The frameworks data from the server
 */
export function initialize(languages: Language[], frameworkList: Framework[]): void {
    baselineLanguages = [...languages];
    baselineFrameworks = [...frameworkList];

    drafts = languages
        .sort(byDisplayOrder)
        .map((l) => ({
            id: l.id,
            _status: 'existing',
            language_name: l.language_name,
            display_order: l.display_order == null ? '' : String(l.display_order),
        }));

    // Initialize frameworks grouped by language ID
    const newFrameworks: Record<number, DraftItem<FrameworkDraft>[]> = {};
    for (const language of languages) {
        const languageFrameworks = frameworkList
            .filter((f) => f.language_id === language.id)
            .sort(byDisplayOrder)
            .map((f): DraftItem<FrameworkDraft> => ({
                id: f.id,
                _status: 'existing' as DraftStatus,
                framework_name: f.framework_name,
                display_order: f.display_order == null ? '' : String(f.display_order),
            }));
        newFrameworks[language.id] = languageFrameworks;
    }
    frameworks = newFrameworks;
}

/**
 * Get all language draft items (including deleted ones).
 */
export function getDrafts(): DraftItem<LanguageDraft>[] {
    return drafts;
}

/**
 * Get visible language draft items (excluding deleted ones).
 */
export function getVisibleDrafts(): DraftItem<LanguageDraft>[] {
    return drafts.filter((d) => d._status !== 'deleted');
}

/**
 * Get frameworks for a specific language.
 *
 * @param languageId - The language ID (real or temp)
 */
export function getFrameworks(languageId: number): DraftItem<FrameworkDraft>[] {
    return frameworks[languageId] ?? [];
}

/**
 * Get visible frameworks for a specific language (excluding deleted ones).
 *
 * @param languageId - The language ID (real or temp)
 */
export function getVisibleFrameworks(languageId: number): DraftItem<FrameworkDraft>[] {
    return (frameworks[languageId] ?? []).filter((d) => d._status !== 'deleted');
}

/**
 * Get the baseline server data for languages.
 */
export function getBaseline(): BaselineLanguage[] {
    return baselineLanguages;
}

/**
 * Get the baseline server data for frameworks.
 */
export function getBaselineFrameworks(): BaselineFramework[] {
    return baselineFrameworks;
}

/**
 * Add a new language draft.
 *
 * @param draft - The language data (without id and display_order)
 */
export function addLanguage(draft: Omit<LanguageDraft, 'id' | 'display_order'>): void {
    const tempId = generateTempId();
    drafts = [
        ...drafts,
        {
            id: tempId,
            _status: 'new',
            ...draft,
            display_order: '',
        },
    ];
    // Initialize empty frameworks for new language
    frameworks = { ...frameworks, [tempId]: [] };
}

/**
 * Update an existing language draft.
 *
 * @param id - The language ID (real or temp)
 * @param partial - Partial data to update
 */
export function updateLanguage(id: number, partial: Partial<LanguageDraft>): void {
    drafts = drafts.map((d) => (d.id === id ? { ...d, ...partial } : d));
}

/**
 * Remove a language draft (marks as deleted).
 *
 * @param id - The language ID (real or temp)
 */
export function removeLanguage(id: number): void {
    drafts = drafts.map((d) =>
        d.id === id ? { ...d, _status: 'deleted' as DraftStatus } : d
    );
}

/**
 * Add a new framework draft to a language.
 *
 * @param languageId - The language ID (real or temp)
 * @param draft - The framework data (without id and display_order)
 */
export function addFramework(
    languageId: number,
    draft: Omit<FrameworkDraft, 'id' | 'display_order'>
): void {
    const current = frameworks[languageId] ?? [];
    frameworks = {
        ...frameworks,
        [languageId]: [
            ...current,
            {
                id: generateTempId(),
                _status: 'new',
                ...draft,
                display_order: '',
            },
        ],
    };
}

/**
 * Update an existing framework draft.
 *
 * @param id - The framework ID (real or temp)
 * @param partial - Partial data to update
 */
export function updateFramework(id: number, partial: Partial<FrameworkDraft>): void {
    // Find which language this framework belongs to
    for (const languageId of Object.keys(frameworks)) {
        const numId = Number(languageId);
        const current = frameworks[numId];
        if (current && current.some((f) => f.id === id)) {
            frameworks = {
                ...frameworks,
                [numId]: current.map((f) => (f.id === id ? { ...f, ...partial } : f)),
            };
            return;
        }
    }
}

/**
 * Remove a framework draft (marks as deleted).
 *
 * @param id - The framework ID (real or temp)
 */
export function removeFramework(id: number): void {
    for (const languageId of Object.keys(frameworks)) {
        const numId = Number(languageId);
        const current = frameworks[numId];
        if (current && current.some((f) => f.id === id)) {
            frameworks = {
                ...frameworks,
                [numId]: current.map((f) =>
                    f.id === id ? { ...f, _status: 'deleted' as DraftStatus } : f
                ),
            };
            return;
        }
    }
}

/**
 * Reorder languages.
 *
 * @param fromId - The ID of the item to move
 * @param toId - The ID of the target position
 */
export function reorder(fromId: number, toId: number): void {
    const fromIndex = drafts.findIndex((d) => d.id === fromId);
    const toIndex = drafts.findIndex((d) => d.id === toId);

    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

    const newDrafts = [...drafts];
    const [removed] = newDrafts.splice(fromIndex, 1);
    newDrafts.splice(toIndex, 0, removed);

    // Update display_order based on new positions
    const updated = newDrafts.map((d, i) => ({
        ...d,
        display_order: String((i + 1) * 10),
    }));

    drafts = updated;
}

/**
 * Reorder frameworks within a language.
 *
 * @param languageId - The language ID
 * @param fromId - The ID of the framework to move
 * @param toId - The ID of the target position
 */
export function reorderFrameworks(languageId: number, fromId: number, toId: number): void {
    const current = frameworks[languageId];
    if (!current) return;

    const fromIndex = current.findIndex((f) => f.id === fromId);
    const toIndex = current.findIndex((f) => f.id === toId);

    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

    const newFrameworks = [...current];
    const [removed] = newFrameworks.splice(fromIndex, 1);
    newFrameworks.splice(toIndex, 0, removed);

    // Update display_order based on new positions
    const updated = newFrameworks.map((f, i) => ({
        ...f,
        display_order: String((i + 1) * 10),
    }));

    frameworks = { ...frameworks, [languageId]: updated };
}

/**
 * Validate a language draft.
 *
 * @param id - The language ID (real or temp)
 */
export function validateLanguage(id: number): void {
    const draft = drafts.find((d) => d.id === id);
    if (!draft) return;

    const errors: string[] = [];

    if (!draft.language_name.trim()) {
        errors.push('Language name is required');
    }

    if (errors.length > 0) {
        drafts = drafts.map((d) =>
            d.id === id ? setValidationError(d, errors.join(', ')) : d
        );
    } else {
        drafts = drafts.map((d) => (d.id === id ? setValidationError(d, null) : d));
    }
}

/**
 * Validate a framework draft.
 *
 * @param id - The framework ID (real or temp)
 */
export function validateFramework(id: number): void {
    for (const languageId of Object.keys(frameworks)) {
        const numId = Number(languageId);
        const current = frameworks[numId];
        if (current && current.some((f) => f.id === id)) {
            const draft = current.find((f) => f.id === id);
            if (!draft) return;

            const errors: string[] = [];

            if (!draft.framework_name.trim()) {
                errors.push('Framework name is required');
            }

            if (errors.length > 0) {
                frameworks = {
                    ...frameworks,
                    [numId]: current.map((f) =>
                        f.id === id ? setValidationError(f, errors.join(', ')) : f
                    ),
                };
            } else {
                frameworks = {
                    ...frameworks,
                    [numId]: current.map((f) => (f.id === id ? setValidationError(f, null) : f)),
                };
            }
            return;
        }
    }
}

/**
 * Check if the languages section has unsaved changes.
 */
export function isDirty(): boolean {
    // Check for new or deleted languages
    if (drafts.some((d) => d._status === 'new')) return true;
    if (drafts.some((d) => d._status === 'deleted')) return true;

    // Check for new or deleted frameworks
    const flatFrameworks = Object.values(frameworks).flat();
    if (flatFrameworks.some((f) => f._status === 'new')) return true;
    if (flatFrameworks.some((f) => f._status === 'deleted')) return true;

    // Check languages - normalize data before comparison
    const baselineLanguageSig = computeSignature(
        baselineLanguages
            .sort(byDisplayOrder)
            .map((l) => ({
                id: l.id,
                language_name: l.language_name,
                display_order: l.display_order,
            }))
    );
    const draftLanguageSig = computeSignature(
        drafts
            .filter((d) => d._status === 'existing')
            .map((d) => ({
                id: d.id,
                language_name: d.language_name,
                display_order: toNumberOrNull(d.display_order),
            }))
            .sort(byDisplayOrder)
    );
    if (baselineLanguageSig !== draftLanguageSig) {
        return true;
    }

    // Check frameworks - normalize data before comparison
    const baselineFrameworkSig = computeSignature(
        baselineFrameworks
            .sort(byDisplayOrder)
            .map((f) => ({
                id: f.id,
                framework_name: f.framework_name,
                display_order: f.display_order,
            }))
    );
    const draftFrameworkSig = computeSignature(
        flatFrameworks
            .filter((f) => f._status === 'existing')
            .map((f) => ({
                id: f.id,
                framework_name: f.framework_name,
                display_order: toNumberOrNull(f.display_order),
            }))
            .sort(byDisplayOrder)
    );
    if (baselineFrameworkSig !== draftFrameworkSig) {
        return true;
    }

    return false;
}

/**
 * Get all validation errors.
 */
export function getValidationErrors(): string[] {
    const errors: string[] = [];

    for (const draft of drafts) {
        if (draft._validationError) {
            errors.push(`Language: ${draft._validationError}`);
        }
    }

    for (const languageFrameworks of Object.values(frameworks)) {
        for (const f of languageFrameworks) {
            if (f._validationError) {
                errors.push(`Framework: ${f._validationError}`);
            }
        }
    }

    return errors;
}

/**
 * Reset all drafts to the baseline.
 */
export function resetToBaseline(): void {
    drafts = baselineLanguages
        .sort(byDisplayOrder)
        .map((l) => ({
            id: l.id,
            _status: 'existing',
            language_name: l.language_name,
            display_order: l.display_order == null ? '' : String(l.display_order),
        }));

    const newFrameworks: Record<number, DraftItem<FrameworkDraft>[]> = {};
    for (const language of baselineLanguages) {
        const languageFrameworks = baselineFrameworks
            .filter((f) => f.language_id === language.id)
            .sort(byDisplayOrder)
            .map((f): DraftItem<FrameworkDraft> => ({
                id: f.id,
                _status: 'existing' as DraftStatus,
                framework_name: f.framework_name,
                display_order: f.display_order == null ? '' : String(f.display_order),
            }));
        newFrameworks[language.id] = languageFrameworks;
    }
    frameworks = newFrameworks;
}

/**
 * Compute the diff between drafts and baseline for the save orchestrator.
 */
export function computeDiff(): LanguageAction[] {
    const actions: LanguageAction[] = [];

    // Process languages
    for (const draft of drafts) {
        if (draft._status === 'new') {
            actions.push({
                type: 'createLanguage',
                tempId: draft.id,
                payload: {
                    language_name: draft.language_name,
                    display_order: toNumberOrNull(draft.display_order),
                },
            });
        } else if (draft._status === 'deleted') {
            // Skip delete actions for items that were never saved (new-then-deleted)
            if (draft.id < 0) continue;
            actions.push({ type: 'deleteLanguage', id: draft.id });
        } else if (draft._status === 'existing') {
            const baseline = baselineLanguages.find((l) => l.id === draft.id);
            if (baseline) {
                const payload: UpdateLanguageRequest = {};
                if (baseline.language_name !== draft.language_name) {
                    payload.language_name = draft.language_name;
                }
                if (String(baseline.display_order ?? '') !== draft.display_order) {
                    payload.display_order = toNumberOrNull(draft.display_order);
                }

                if (Object.keys(payload).length > 0) {
                    actions.push({ type: 'updateLanguage', id: draft.id, payload });
                }
            }
        }
    }

    // Process frameworks
    for (const [languageId, languageFrameworks] of Object.entries(frameworks)) {
        const numLanguageId = Number(languageId);
        const baselineFrameworksForLanguage = baselineFrameworks.filter(
            (f) => f.language_id === numLanguageId
        );

        for (const f of languageFrameworks) {
            if (f._status === 'new') {
                actions.push({
                    type: 'createFramework',
                    languageId: numLanguageId,
                    tempId: f.id,
                    payload: {
                        framework_name: f.framework_name,
                        display_order: toNumberOrNull(f.display_order),
                    },
                });
            } else if (f._status === 'deleted') {
                // Skip delete actions for items that were never saved (new-then-deleted)
                if (f.id < 0) continue;
                actions.push({ type: 'deleteFramework', id: f.id });
            } else if (f._status === 'existing') {
                const baseline = baselineFrameworksForLanguage.find((b) => b.id === f.id);
                if (baseline) {
                    const payload: UpdateFrameworkRequest = {};
                    if (baseline.framework_name !== f.framework_name) {
                        payload.framework_name = f.framework_name;
                    }
                    if (String(baseline.display_order ?? '') !== f.display_order) {
                        payload.display_order = toNumberOrNull(f.display_order);
                    }

                    if (Object.keys(payload).length > 0) {
                        actions.push({ type: 'updateFramework', id: f.id, payload });
                    }
                }
            }
        }
    }

    return actions;
}

/**
 * Apply save results from the server (update temp IDs to real IDs).
 *
 * @param tempIdMap - Map of temp IDs to real server IDs
 */
export function applySaveResults(tempIdMap: Map<number, number>): void {
    // Update language IDs - only mark successful creations as existing
    drafts = drafts
        .filter((d) => d._status !== 'deleted')
        .map((d) => {
            if (d._status === 'new' && tempIdMap.has(d.id)) {
                return { ...d, id: tempIdMap.get(d.id)!, _status: 'existing' as DraftStatus };
            }
            return d;
        });

    // Update framework IDs - only mark successful creations as existing
    const newFrameworks: Record<number, DraftItem<FrameworkDraft>[]> = {};
    for (const languageId of Object.keys(frameworks)) {
        const numLanguageId = Number(languageId);
        // Check if language ID was remapped
        const realLanguageId = tempIdMap.get(numLanguageId) ?? numLanguageId;
        newFrameworks[realLanguageId] = frameworks[numLanguageId]
            .filter((f) => f._status !== 'deleted')
            .map((f) => {
                if (f._status === 'new' && tempIdMap.has(f.id)) {
                    return { ...f, id: tempIdMap.get(f.id)!, _status: 'existing' as DraftStatus };
                }
                return f;
            });
    }
    frameworks = newFrameworks;

    // Remove deleted items from baseline
    baselineLanguages = baselineLanguages.filter(bl =>
        !drafts.find(d => d.id === bl.id && d._status === 'deleted')
    );
    baselineFrameworks = baselineFrameworks.filter(bf =>
        !Object.values(frameworks).flat().find(f => f.id === bf.id && f._status === 'deleted')
    );
}

/**
 * Keep failed items in dirty state for retry.
 *
 * @param failedIds - Set of IDs that failed to save
 */
export function keepFailedItems(failedIds: Set<number>): void {
    // Keep languages with failed saves as-is, mark successful new items as existing
    drafts = drafts.map((d) => {
        if (failedIds.has(d.id)) {
            return d; // Keep status as-is
        }
        if (d._status === 'new') {
            return { ...d, _status: 'existing' as DraftStatus };
        }
        return d;
    });

    // Keep frameworks with failed saves as-is, mark successful new items as existing
    for (const languageId of Object.keys(frameworks)) {
        const numLanguageId = Number(languageId);
        frameworks = {
            ...frameworks,
            [numLanguageId]: frameworks[numLanguageId].map((f) => {
                if (failedIds.has(f.id)) {
                    return f; // Keep status as-is
                }
                if (f._status === 'new') {
                    return { ...f, _status: 'existing' as DraftStatus };
                }
                return f;
            }),
        };
    }
}

/**
 * Get the current saving state.
 */
export function getSaving(): boolean {
    return saving;
}

/**
 * Set the saving state.
 */
export function setSaving(value: boolean): void {
    saving = value;
}

/**
 * Get the current error message.
 */
export function getError(): string | null {
    return error;
}

/**
 * Set the error message.
 */
export function setError(value: string | null): void {
    error = value;
}