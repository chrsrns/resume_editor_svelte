/**
 * Draft module for education with nested key points.
 *
 * This module manages the draft state for the education section,
 * which includes education entries and their nested key points.
 */

import type {
    Education,
    EducationKeyPoint,
    NewEducationRequest,
    UpdateEducationRequest,
    NewEducationKeyPointRequest,
    UpdateEducationKeyPointRequest
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
 * Draft data shape for an education entry.
 * All fields are strings for easier form binding.
 */
type EducationDraft = {
    id: number;
    education_stage: string;
    institution_name: string;
    degree: string;
    start_date: string;
    end_date: string;
    description: string;
    display_order: string;
};

/**
 * Draft data shape for a key point.
 */
type KeyPointDraft = {
    id: number;
    key_point: string;
    display_order: string;
};

/**
 * Baseline data shape (matches server response).
 */
type BaselineEducation = Education;
type BaselineKeyPoint = EducationKeyPoint;

/**
 * Action type for save orchestrator.
 */
export type EducationAction =
    | { type: 'createEducation'; tempId: number; payload: NewEducationRequest }
    | { type: 'updateEducation'; id: number; payload: UpdateEducationRequest }
    | { type: 'deleteEducation'; id: number }
    | {
        type: 'createKeyPoint';
        educationId: number;
        tempId: number;
        payload: NewEducationKeyPointRequest;
    }
    | { type: 'updateKeyPoint'; id: number; payload: UpdateEducationKeyPointRequest }
    | { type: 'deleteKeyPoint'; id: number };

/**
 * Result of a save operation.
 */
export type EducationActionResult = {
    action: EducationAction;
    success: boolean;
    realId?: number;
    error?: string;
};

// State
let baselineEducations: BaselineEducation[] = [];
let baselineKeyPoints: BaselineKeyPoint[] = [];
let drafts = $state<DraftItem<EducationDraft>[]>([]);
let keyPoints = $state<Record<number, DraftItem<KeyPointDraft>[]>>({});
let saving = $state(false);
let error = $state<string | null>(null);

/**
 * Initialize the draft module with server data.
 *
 * @param educations - The education data from the server
 * @param keyPointList - The key points data from the server
 */
export function initialize(educations: Education[], keyPointList: EducationKeyPoint[]): void {
    baselineEducations = [...educations];
    baselineKeyPoints = [...keyPointList];

    drafts = educations.sort(byDisplayOrder).map((e) => ({
        id: e.id,
        _status: 'existing',
        education_stage: e.education_stage,
        institution_name: e.institution_name,
        degree: String(e.degree ?? ''),
        start_date: e.start_date,
        end_date: e.end_date ?? '',
        description: e.description ?? '',
        display_order: e.display_order == null ? '' : String(e.display_order)
    }));

    // Initialize key points grouped by education ID
    const newKeyPoints: Record<number, DraftItem<KeyPointDraft>[]> = {};
    for (const education of educations) {
        const educationKeyPoints = keyPointList
            .filter((kp) => kp.education_id === education.id)
            .sort(byDisplayOrder)
            .map(
                (kp): DraftItem<KeyPointDraft> => ({
                    id: kp.id,
                    _status: 'existing' as DraftStatus,
                    key_point: kp.key_point,
                    display_order: kp.display_order == null ? '' : String(kp.display_order)
                })
            );
        newKeyPoints[education.id] = educationKeyPoints;
    }
    keyPoints = newKeyPoints;
}

/**
 * Get all education draft items (including deleted ones).
 */
export function getDrafts(): DraftItem<EducationDraft>[] {
    return drafts;
}

/**
 * Get visible education draft items (excluding deleted ones).
 */
export function getVisibleDrafts(): DraftItem<EducationDraft>[] {
    return drafts.filter((d) => d._status !== 'deleted');
}

/**
 * Get key points for a specific education.
 *
 * @param educationId - The education ID (real or temp)
 */
export function getKeyPoints(educationId: number): DraftItem<KeyPointDraft>[] {
    return keyPoints[educationId] ?? [];
}

/**
 * Get visible key points for a specific education (excluding deleted ones).
 *
 * @param educationId - The education ID (real or temp)
 */
export function getVisibleKeyPoints(educationId: number): DraftItem<KeyPointDraft>[] {
    return (keyPoints[educationId] ?? []).filter((d) => d._status !== 'deleted');
}

/**
 * Get the baseline server data for educations.
 */
export function getBaseline(): BaselineEducation[] {
    return baselineEducations;
}

/**
 * Get the baseline server data for key points.
 */
export function getBaselineKeyPoints(): BaselineKeyPoint[] {
    return baselineKeyPoints;
}

/**
 * Add a new education draft.
 *
 * @param draft - The education data (without id and display_order)
 */
export function addEducation(draft: Omit<EducationDraft, 'id' | 'display_order'>): void {
    const tempId = generateTempId();
    // Calculate next display order (max existing + 10, or 10 if none exist)
    const maxOrder = drafts
        .filter((d) => d._status !== 'deleted')
        .reduce((max, d) => {
            const order = toNumberOrNull(d.display_order) ?? 0;
            return order > max ? order : max;
        }, 0);
    const nextOrder = String(maxOrder + 10);

    drafts = [
        ...drafts,
        {
            id: tempId,
            _status: 'new',
            ...draft,
            display_order: nextOrder
        }
    ];
    // Initialize empty key points for new education
    keyPoints = { ...keyPoints, [tempId]: [] };
}

/**
 * Update an existing education draft.
 *
 * @param id - The education ID (real or temp)
 * @param partial - Partial data to update
 */
export function updateEducation(id: number, partial: Partial<EducationDraft>): void {
    drafts = drafts.map((d) => (d.id === id ? { ...d, ...partial } : d));
}

/**
 * Remove an education draft (marks as deleted).
 *
 * @param id - The education ID (real or temp)
 */
export function removeEducation(id: number): void {
    drafts = drafts.map((d) => (d.id === id ? { ...d, _status: 'deleted' as DraftStatus } : d));
}

/**
 * Add a new key point draft to an education.
 *
 * @param educationId - The education ID (real or temp)
 * @param draft - The key point data (without id and display_order)
 */
export function addKeyPoint(
    educationId: number,
    draft: Omit<KeyPointDraft, 'id' | 'display_order'>
): void {
    const current = keyPoints[educationId] ?? [];
    keyPoints = {
        ...keyPoints,
        [educationId]: [
            ...current,
            {
                id: generateTempId(),
                _status: 'new',
                ...draft,
                display_order: ''
            }
        ]
    };
}

/**
 * Update an existing key point draft.
 *
 * @param id - The key point ID (real or temp)
 * @param partial - Partial data to update
 */
export function updateKeyPoint(id: number, partial: Partial<KeyPointDraft>): void {
    // Find which education this key point belongs to
    for (const educationId of Object.keys(keyPoints)) {
        const numId = Number(educationId);
        const current = keyPoints[numId];
        if (current && current.some((kp) => kp.id === id)) {
            keyPoints = {
                ...keyPoints,
                [numId]: current.map((kp) => (kp.id === id ? { ...kp, ...partial } : kp))
            };
            return;
        }
    }
}

/**
 * Remove a key point draft (marks as deleted).
 *
 * @param id - The key point ID (real or temp)
 */
export function removeKeyPoint(id: number): void {
    for (const educationId of Object.keys(keyPoints)) {
        const numId = Number(educationId);
        const current = keyPoints[numId];
        if (current && current.some((kp) => kp.id === id)) {
            keyPoints = {
                ...keyPoints,
                [numId]: current.map((kp) =>
                    kp.id === id ? { ...kp, _status: 'deleted' as DraftStatus } : kp
                )
            };
            return;
        }
    }
}

/**
 * Reorder educations locally.
 *
 * @param fromId - The ID of the item to move
 * @param toId - The ID of the target position
 */
export function reorderEducation(fromId: number, toId: number): void {
    const visible = getVisibleDrafts();
    const fromIndex = visible.findIndex((d) => d.id === fromId);
    const toIndex = visible.findIndex((d) => d.id === toId);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
        return;
    }

    const reordered = [...visible];
    const [item] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, item);

    // Update display_order based on new positions
    const updated = reordered.map((d, i) => ({
        ...d,
        display_order: String((i + 1) * 10)
    }));

    // Merge back with deleted items
    const deleted = drafts.filter((d) => d._status === 'deleted');
    drafts = [...updated, ...deleted];
}

/**
 * Reorder key points within an education locally.
 *
 * @param educationId - The education ID (real or temp)
 * @param fromId - The ID of the key point to move
 * @param toId - The ID of the target position
 */
export function reorderKeyPoint(educationId: number, fromId: number, toId: number): void {
    const visible = getVisibleKeyPoints(educationId);
    const fromIndex = visible.findIndex((d) => d.id === fromId);
    const toIndex = visible.findIndex((d) => d.id === toId);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
        return;
    }

    const reordered = [...visible];
    const [item] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, item);

    // Update display_order based on new positions
    const updated = reordered.map((d, i) => ({
        ...d,
        display_order: String((i + 1) * 10)
    }));

    // Merge back with deleted items
    const deleted = (keyPoints[educationId] ?? []).filter((d) => d._status === 'deleted');
    keyPoints = {
        ...keyPoints,
        [educationId]: [...updated, ...deleted]
    };
}

/**
 * Validate a specific education draft.
 *
 * @param id - The education ID to validate
 * @returns true if valid, false otherwise
 */
export function validateEducation(id: number): boolean {
    const draft = drafts.find((d) => d.id === id);
    if (!draft) return false;

    let valid = true;

    if (!draft.education_stage.trim()) {
        drafts = drafts.map((d) =>
            d.id === id ? setValidationError(d, 'Education stage is required') : d
        );
        valid = false;
    }

    if (!draft.institution_name.trim()) {
        drafts = drafts.map((d) =>
            d.id === id ? setValidationError(d, 'Institution name is required') : d
        );
        valid = false;
    }

    if (!draft.start_date.trim()) {
        drafts = drafts.map((d) =>
            d.id === id ? setValidationError(d, 'Start date is required') : d
        );
        valid = false;
    }

    if (valid) {
        drafts = drafts.map((d) => (d.id === id ? setValidationError(d, null) : d));
    }

    return valid;
}

/**
 * Validate a specific key point draft.
 *
 * @param id - The key point ID to validate
 * @returns true if valid, false otherwise
 */
export function validateKeyPoint(id: number): boolean {
    for (const educationId of Object.keys(keyPoints)) {
        const numId = Number(educationId);
        const current = keyPoints[numId];
        if (current) {
            const draft = current.find((kp) => kp.id === id);
            if (draft) {
                let valid = true;

                if (!draft.key_point.trim()) {
                    keyPoints = {
                        ...keyPoints,
                        [numId]: current.map((kp) =>
                            kp.id === id ? setValidationError(kp, 'Key point is required') : kp
                        )
                    };
                    valid = false;
                }

                if (valid) {
                    keyPoints = {
                        ...keyPoints,
                        [numId]: current.map((kp) =>
                            kp.id === id ? setValidationError(kp, null) : kp
                        )
                    };
                }

                return valid;
            }
        }
    }
    return false;
}

/**
 * Validate all visible education drafts and their key points.
 *
 * @returns true if all visible items are valid, false otherwise
 */
export function validateAll(): boolean {
    let valid = true;
    for (const draft of getVisibleDrafts()) {
        if (!validateEducation(draft.id)) {
            valid = false;
        }
    }
    for (const educationId of Object.keys(keyPoints)) {
        for (const keyPoint of getVisibleKeyPoints(Number(educationId))) {
            if (!validateKeyPoint(keyPoint.id)) {
                valid = false;
            }
        }
    }
    return valid;
}

/**
 * Check if any draft has unsaved changes compared to the baseline.
 */
export function isDirty(): boolean {
    // Check if any education is new
    if (drafts.some((d) => d._status === 'new')) {
        return true;
    }

    // Check if any education is deleted
    if (drafts.some((d) => d._status === 'deleted')) {
        return true;
    }

    // Check if any key point is new
    for (const educationId of Object.keys(keyPoints)) {
        const current = keyPoints[Number(educationId)];
        if (current && current.some((kp) => kp._status === 'new')) {
            return true;
        }
    }

    // Check if any key point is deleted
    for (const educationId of Object.keys(keyPoints)) {
        const current = keyPoints[Number(educationId)];
        if (current && current.some((kp) => kp._status === 'deleted')) {
            return true;
        }
    }

    // Compare education signatures
    const baselineEduSig = computeSignature(
        baselineEducations.sort(byDisplayOrder).map((e) => ({
            id: e.id,
            education_stage: e.education_stage,
            institution_name: e.institution_name,
            degree: e.degree,
            start_date: e.start_date,
            end_date: e.end_date,
            description: e.description,
            display_order: e.display_order
        }))
    );
    const draftEduSig = computeSignature(
        drafts
            .filter((d) => d._status === 'existing')
            .map((d) => ({
                id: d.id,
                education_stage: d.education_stage.trim(),
                institution_name: d.institution_name.trim(),
                degree: toNullable(d.degree),
                start_date: d.start_date,
                end_date: toNullable(d.end_date),
                description: toNullable(d.description),
                display_order: toNumberOrNull(d.display_order)
            }))
            .sort(byDisplayOrder)
    );
    if (baselineEduSig !== draftEduSig) {
        return true;
    }

    // Compare key point signatures
    const baselineKpSig = computeSignature(
        baselineKeyPoints.sort(byDisplayOrder).map((kp) => ({
            id: kp.id,
            education_id: kp.education_id,
            key_point: kp.key_point,
            display_order: kp.display_order
        }))
    );
    const draftKpList: Array<{
        id: number;
        education_id: number;
        key_point: string;
        display_order: number | null;
    }> = [];
    for (const educationId of Object.keys(keyPoints)) {
        const numId = Number(educationId);
        const current = keyPoints[numId];
        if (current) {
            for (const kp of current.filter((kp) => kp._status === 'existing')) {
                draftKpList.push({
                    id: kp.id,
                    education_id: numId,
                    key_point: kp.key_point.trim(),
                    display_order: toNumberOrNull(kp.display_order)
                });
            }
        }
    }
    const draftKpSig = computeSignature(draftKpList.sort(byDisplayOrder));
    if (baselineKpSig !== draftKpSig) {
        return true;
    }

    return false;
}

/**
 * Get all validation error messages.
 */
export function getValidationErrors(): string[] {
    const errors: string[] = [];
    for (const draft of drafts) {
        if (draft._validationError) {
            errors.push(`Education: ${draft._validationError}`);
        }
    }
    for (const educationId of Object.keys(keyPoints)) {
        const current = keyPoints[Number(educationId)];
        if (current) {
            for (const kp of current) {
                if (kp._validationError) {
                    errors.push(`Key point: ${kp._validationError}`);
                }
            }
        }
    }
    return errors;
}

/**
 * Reset all drafts to the baseline server data.
 */
export function resetToBaseline(): void {
    initialize(baselineEducations, baselineKeyPoints);
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
 * Compute the diff between drafts and baseline for the save orchestrator.
 */
export function computeDiff(): EducationAction[] {
    const actions: EducationAction[] = [];

    // Process education actions first (parents)
    for (const draft of drafts) {
        if (draft._status === 'new') {
            actions.push({
                type: 'createEducation',
                tempId: draft.id,
                payload: {
                    education_stage: draft.education_stage.trim(),
                    institution_name: draft.institution_name.trim(),
                    degree: toNullable(draft.degree),
                    start_date: draft.start_date,
                    end_date: toNullable(draft.end_date),
                    description: toNullable(draft.description),
                    display_order: toNumberOrNull(draft.display_order)
                }
            });
        } else if (draft._status === 'deleted') {
            // Skip delete actions for items that were never saved (new-then-deleted)
            if (draft.id < 0) continue;
            actions.push({ type: 'deleteEducation', id: draft.id });
        } else if (draft._status === 'existing') {
            const baseline = baselineEducations.find((e) => e.id === draft.id);
            if (baseline) {
                const payload: UpdateEducationRequest = {};
                if (draft.education_stage.trim() !== baseline.education_stage) {
                    payload.education_stage = draft.education_stage.trim();
                }
                if (draft.institution_name.trim() !== baseline.institution_name) {
                    payload.institution_name = draft.institution_name.trim();
                }
                if (toNullable(draft.degree) !== baseline.degree) {
                    payload.degree = toNullable(draft.degree);
                }
                if (draft.start_date !== baseline.start_date) {
                    payload.start_date = draft.start_date;
                }
                if (toNullable(draft.end_date) !== baseline.end_date) {
                    payload.end_date = toNullable(draft.end_date);
                }
                if (toNullable(draft.description) !== baseline.description) {
                    payload.description = toNullable(draft.description);
                }
                if (toNumberOrNull(draft.display_order) !== baseline.display_order) {
                    payload.display_order = toNumberOrNull(draft.display_order);
                }
                if (Object.keys(payload).length > 0) {
                    actions.push({
                        type: 'updateEducation',
                        id: draft.id,
                        payload
                    });
                }
            }
        }
    }

    // Process key point actions (children)
    for (const educationId of Object.keys(keyPoints)) {
        const numId = Number(educationId);
        const current = keyPoints[numId];
        if (current) {
            for (const kp of current) {
                if (kp._status === 'new') {
                    // If the parent education is new, use the temp ID
                    // The save orchestrator will handle the mapping
                    actions.push({
                        type: 'createKeyPoint',
                        educationId: numId,
                        tempId: kp.id,
                        payload: {
                            key_point: kp.key_point.trim(),
                            display_order: toNumberOrNull(kp.display_order)
                        }
                    });
                } else if (kp._status === 'deleted') {
                    // Skip delete actions for items that were never saved (new-then-deleted)
                    if (kp.id < 0) continue;
                    actions.push({ type: 'deleteKeyPoint', id: kp.id });
                } else if (kp._status === 'existing') {
                    const baseline = baselineKeyPoints.find((b) => b.id === kp.id);
                    if (baseline) {
                        const payload: UpdateEducationKeyPointRequest = {};
                        if (kp.key_point.trim() !== baseline.key_point) {
                            payload.key_point = kp.key_point.trim();
                        }
                        if (toNumberOrNull(kp.display_order) !== baseline.display_order) {
                            payload.display_order = toNumberOrNull(kp.display_order);
                        }
                        if (Object.keys(payload).length > 0) {
                            actions.push({
                                type: 'updateKeyPoint',
                                id: kp.id,
                                payload
                            });
                        }
                    }
                }
            }
        }
    }

    return actions;
}

/**
 * Apply save results to drafts.
 *
 * Maps temp IDs for newly created items to real IDs and removes deleted items.
 * Baseline is not updated here; call `commitBaseline()` after all save phases
 * succeed so failed items remain dirty for retry.
 *
 * @param tempIdMap - Map of temp IDs to real IDs
 */
export function applySaveResults(tempIdMap: Map<number, number>): void {
    // Update education drafts
    drafts = drafts
        .map((d) => {
            if (d._status === 'new' && tempIdMap.has(d.id)) {
                return { ...d, id: tempIdMap.get(d.id)!, _status: 'existing' as DraftStatus };
            }
            if (d._status === 'deleted') {
                // Remove deleted items from drafts
                return null;
            }
            return d;
        })
        .filter((d): d is DraftItem<EducationDraft> => d !== null);

    // Update key points
    const newKeyPoints: Record<number, DraftItem<KeyPointDraft>[]> = {};
    for (const educationId of Object.keys(keyPoints)) {
        const numId = Number(educationId);
        const current = keyPoints[numId];
        if (current) {
            // Check if the education ID was a temp ID
            const realEducationId = tempIdMap.get(numId) ?? numId;

            const updated = current
                .map((kp) => {
                    if (kp._status === 'new' && tempIdMap.has(kp.id)) {
                        return {
                            ...kp,
                            id: tempIdMap.get(kp.id)!,
                            _status: 'existing' as DraftStatus
                        };
                    }
                    if (kp._status === 'deleted') {
                        return null;
                    }
                    return kp;
                })
                .filter((kp): kp is DraftItem<KeyPointDraft> => kp !== null);

            newKeyPoints[realEducationId] = updated;
        }
    }
    keyPoints = newKeyPoints;
}

/**
 * Commit the current draft state to the baseline after a successful save.
 */
export function commitBaseline(): void {
    // Get resume_id from existing baseline items (they should all have the same resume_id)
    const resumeId = baselineEducations[0]?.resume_id ?? 0;

    baselineEducations = drafts
        .filter((d) => d._status === 'existing')
        .map((d) => {
            const existing = baselineEducations.find((be) => be.id === d.id);
            return {
                id: d.id,
                resume_id: existing?.resume_id ?? resumeId,
                education_stage: d.education_stage.trim(),
                institution_name: d.institution_name.trim(),
                degree: toNullable(d.degree),
                start_date: d.start_date,
                end_date: toNullable(d.end_date),
                description: toNullable(d.description),
                display_order: toNumberOrNull(d.display_order),
                active: existing?.active ?? true,
                created_at: existing?.created_at ?? ''
            };
        });

    baselineKeyPoints = [];
    for (const educationId of Object.keys(keyPoints)) {
        const numId = Number(educationId);
        const current = keyPoints[numId];
        if (current) {
            for (const kp of current.filter((k) => k._status === 'existing')) {
                const existing = baselineKeyPoints.find((bkp) => bkp.id === kp.id);
                baselineKeyPoints.push({
                    id: kp.id,
                    education_id: numId,
                    key_point: kp.key_point.trim(),
                    display_order: toNumberOrNull(kp.display_order),
                    created_at: existing?.created_at ?? ''
                });
            }
        }
    }
}
