/**
 * Draft module for work experience with nested key points.
 *
 * This module manages the draft state for the work experience section,
 * which includes work experience entries and their nested key points.
 */

import type {
    WorkExperience,
    WorkExperienceKeyPoint,
    NewWorkExperienceRequest,
    UpdateWorkExperienceRequest,
    NewWorkExperienceKeyPointRequest,
    UpdateWorkExperienceKeyPointRequest
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
 * Draft data shape for a work experience entry.
 * All fields are strings for easier form binding.
 */
type WorkDraft = {
    id: number;
    job_title: string;
    company_name: string;
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
type BaselineWork = WorkExperience;
type BaselineKeyPoint = WorkExperienceKeyPoint;

/**
 * Action type for save orchestrator.
 */
export type WorkAction =
    | { type: 'createWork'; tempId: number; payload: NewWorkExperienceRequest }
    | { type: 'updateWork'; id: number; payload: UpdateWorkExperienceRequest }
    | { type: 'deleteWork'; id: number }
    | { type: 'createKeyPoint'; workId: number; tempId: number; payload: NewWorkExperienceKeyPointRequest }
    | { type: 'updateKeyPoint'; id: number; payload: UpdateWorkExperienceKeyPointRequest }
    | { type: 'deleteKeyPoint'; id: number };

/**
 * Result of a save operation.
 */
export type WorkActionResult = {
    action: WorkAction;
    success: boolean;
    realId?: number;
    error?: string;
};

// State
let baselineWorks: BaselineWork[] = [];
let baselineKeyPoints: BaselineKeyPoint[] = [];
let drafts = $state<DraftItem<WorkDraft>[]>([]);
let keyPoints = $state<Record<number, DraftItem<KeyPointDraft>[]>>({});
let saving = $state(false);
let error = $state<string | null>(null);

/**
 * Initialize the draft module with server data.
 *
 * @param works - The work experience data from the server
 * @param keyPointList - The key points data from the server
 */
export function initialize(
    works: WorkExperience[],
    keyPointList: WorkExperienceKeyPoint[]
): void {
    baselineWorks = [...works];
    baselineKeyPoints = [...keyPointList];

    drafts = works
        .sort(byDisplayOrder)
        .map((w) => ({
            id: w.id,
            _status: 'existing',
            job_title: w.job_title,
            company_name: w.company_name ?? '',
            start_date: w.start_date,
            end_date: w.end_date ?? '',
            description: w.description ?? '',
            display_order: w.display_order == null ? '' : String(w.display_order),
        }));

    // Initialize key points grouped by work ID
    const newKeyPoints: Record<number, DraftItem<KeyPointDraft>[]> = {};
    for (const work of works) {
        const workKeyPoints = keyPointList
            .filter((kp) => kp.work_experience_id === work.id)
            .sort(byDisplayOrder)
            .map((kp): DraftItem<KeyPointDraft> => ({
                id: kp.id,
                _status: 'existing' as DraftStatus,
                key_point: kp.key_point,
                display_order: kp.display_order == null ? '' : String(kp.display_order),
            }));
        newKeyPoints[work.id] = workKeyPoints;
    }
    keyPoints = newKeyPoints;
}

/**
 * Get all work draft items (including deleted ones).
 */
export function getDrafts(): DraftItem<WorkDraft>[] {
    return drafts;
}

/**
 * Get visible work draft items (excluding deleted ones).
 */
export function getVisibleDrafts(): DraftItem<WorkDraft>[] {
    return drafts.filter((d) => d._status !== 'deleted');
}

/**
 * Get key points for a specific work experience.
 *
 * @param workId - The work experience ID (real or temp)
 */
export function getKeyPoints(workId: number): DraftItem<KeyPointDraft>[] {
    return keyPoints[workId] ?? [];
}

/**
 * Get visible key points for a specific work experience (excluding deleted ones).
 *
 * @param workId - The work experience ID (real or temp)
 */
export function getVisibleKeyPoints(workId: number): DraftItem<KeyPointDraft>[] {
    return (keyPoints[workId] ?? []).filter((d) => d._status !== 'deleted');
}

/**
 * Get the baseline server data for work experiences.
 */
export function getBaseline(): BaselineWork[] {
    return baselineWorks;
}

/**
 * Get the baseline server data for key points.
 */
export function getBaselineKeyPoints(): BaselineKeyPoint[] {
    return baselineKeyPoints;
}

/**
 * Add a new work experience draft.
 *
 * @param draft - The work experience data (without id and display_order)
 */
export function addWork(draft: Omit<WorkDraft, 'id' | 'display_order'>): void {
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
            display_order: nextOrder,
        },
    ];
    // Initialize empty key points for new work experience
    keyPoints = { ...keyPoints, [tempId]: [] };
}

/**
 * Update an existing work experience draft.
 *
 * @param id - The work experience ID (real or temp)
 * @param partial - Partial data to update
 */
export function updateWork(id: number, partial: Partial<WorkDraft>): void {
    drafts = drafts.map((d) => (d.id === id ? { ...d, ...partial } : d));
}

/**
 * Remove a work experience draft (marks as deleted).
 *
 * @param id - The work experience ID (real or temp)
 */
export function removeWork(id: number): void {
    drafts = drafts.map((d) =>
        d.id === id ? { ...d, _status: 'deleted' as DraftStatus } : d
    );
}

/**
 * Add a new key point draft to a work experience.
 *
 * @param workId - The work experience ID (real or temp)
 * @param draft - The key point data (without id and display_order)
 */
export function addKeyPoint(
    workId: number,
    draft: Omit<KeyPointDraft, 'id' | 'display_order'>
): void {
    const current = keyPoints[workId] ?? [];
    keyPoints = {
        ...keyPoints,
        [workId]: [
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
 * Update an existing key point draft.
 *
 * @param id - The key point ID (real or temp)
 * @param partial - Partial data to update
 */
export function updateKeyPoint(id: number, partial: Partial<KeyPointDraft>): void {
    // Find which work experience this key point belongs to
    for (const workId of Object.keys(keyPoints)) {
        const numId = Number(workId);
        const current = keyPoints[numId];
        if (current && current.some((kp) => kp.id === id)) {
            keyPoints = {
                ...keyPoints,
                [numId]: current.map((kp) => (kp.id === id ? { ...kp, ...partial } : kp)),
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
    for (const workId of Object.keys(keyPoints)) {
        const numId = Number(workId);
        const current = keyPoints[numId];
        if (current && current.some((kp) => kp.id === id)) {
            keyPoints = {
                ...keyPoints,
                [numId]: current.map((kp) =>
                    kp.id === id ? { ...kp, _status: 'deleted' as DraftStatus } : kp
                ),
            };
            return;
        }
    }
}

/**
 * Reorder work experiences.
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
 * Reorder key points within a work experience.
 *
 * @param workId - The work experience ID
 * @param fromId - The ID of the key point to move
 * @param toId - The ID of the target position
 */
export function reorderKeyPoints(workId: number, fromId: number, toId: number): void {
    const current = keyPoints[workId];
    if (!current) return;

    const fromIndex = current.findIndex((kp) => kp.id === fromId);
    const toIndex = current.findIndex((kp) => kp.id === toId);

    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

    const newKeyPoints = [...current];
    const [removed] = newKeyPoints.splice(fromIndex, 1);
    newKeyPoints.splice(toIndex, 0, removed);

    // Update display_order based on new positions
    const updated = newKeyPoints.map((kp, i) => ({
        ...kp,
        display_order: String((i + 1) * 10),
    }));

    keyPoints = { ...keyPoints, [workId]: updated };
}

/**
 * Validate a work experience draft.
 *
 * @param id - The work experience ID (real or temp)
 * @returns true if valid, false otherwise
 */
export function validateWork(id: number): boolean {
    const draft = drafts.find((d) => d.id === id);
    if (!draft) return false;

    const errors: string[] = [];

    if (!draft.job_title.trim()) {
        errors.push('Job title is required');
    }

    if (!draft.start_date.trim()) {
        errors.push('Start date is required');
    }

    if (errors.length > 0) {
        drafts = drafts.map((d) =>
            d.id === id ? setValidationError(d, errors.join(', ')) : d
        );
        return false;
    } else {
        drafts = drafts.map((d) => (d.id === id ? setValidationError(d, null) : d));
        return true;
    }
}

/**
 * Validate a key point draft.
 *
 * @param id - The key point ID (real or temp)
 * @returns true if valid, false otherwise
 */
export function validateKeyPoint(id: number): boolean {
    for (const workId of Object.keys(keyPoints)) {
        const numId = Number(workId);
        const current = keyPoints[numId];
        if (current && current.some((kp) => kp.id === id)) {
            const draft = current.find((kp) => kp.id === id);
            if (!draft) return false;

            const errors: string[] = [];

            if (!draft.key_point.trim()) {
                errors.push('Key point is required');
            }

            if (errors.length > 0) {
                keyPoints = {
                    ...keyPoints,
                    [numId]: current.map((kp) =>
                        kp.id === id ? setValidationError(kp, errors.join(', ')) : kp
                    ),
                };
                return false;
            } else {
                keyPoints = {
                    ...keyPoints,
                    [numId]: current.map((kp) => (kp.id === id ? setValidationError(kp, null) : kp)),
                };
                return true;
            }
        }
    }
    return false;
}

/**
 * Check if the work section has unsaved changes.
 */
export function isDirty(): boolean {
    // Check for new or deleted work experiences
    if (drafts.some((d) => d._status === 'new')) return true;
    if (drafts.some((d) => d._status === 'deleted')) return true;

    // Check for new or deleted key points
    const flatKeyPoints = Object.values(keyPoints).flat();
    if (flatKeyPoints.some((kp) => kp._status === 'new')) return true;
    if (flatKeyPoints.some((kp) => kp._status === 'deleted')) return true;

    // Check work experiences - normalize data before comparison
    const baselineWorkSig = computeSignature(
        baselineWorks
            .sort(byDisplayOrder)
            .map((w) => ({
                id: w.id,
                job_title: w.job_title,
                company_name: w.company_name ?? '',
                start_date: w.start_date,
                end_date: w.end_date ?? '',
                description: w.description ?? '',
                display_order: w.display_order,
            }))
    );
    const draftWorkSig = computeSignature(
        drafts
            .filter((d) => d._status === 'existing')
            .map((d) => ({
                id: d.id,
                job_title: d.job_title,
                company_name: d.company_name,
                start_date: d.start_date,
                end_date: d.end_date,
                description: d.description,
                display_order: toNumberOrNull(d.display_order),
            }))
            .sort(byDisplayOrder)
    );
    if (baselineWorkSig !== draftWorkSig) {
        return true;
    }

    // Check key points - normalize data before comparison
    const baselineKeyPointSig = computeSignature(
        baselineKeyPoints
            .sort(byDisplayOrder)
            .map((kp) => ({
                id: kp.id,
                key_point: kp.key_point,
                display_order: kp.display_order,
            }))
    );
    const draftKeyPointSig = computeSignature(
        flatKeyPoints
            .filter((kp) => kp._status === 'existing')
            .map((kp) => ({
                id: kp.id,
                key_point: kp.key_point,
                display_order: toNumberOrNull(kp.display_order),
            }))
            .sort(byDisplayOrder)
    );
    if (baselineKeyPointSig !== draftKeyPointSig) {
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
            errors.push(`Work experience: ${draft._validationError}`);
        }
    }

    for (const workKeyPoints of Object.values(keyPoints)) {
        for (const kp of workKeyPoints) {
            if (kp._validationError) {
                errors.push(`Key point: ${kp._validationError}`);
            }
        }
    }

    return errors;
}

/**
 * Reset all drafts to the baseline.
 */
export function resetToBaseline(): void {
    drafts = baselineWorks
        .sort(byDisplayOrder)
        .map((w) => ({
            id: w.id,
            _status: 'existing',
            job_title: w.job_title,
            company_name: w.company_name ?? '',
            start_date: w.start_date,
            end_date: w.end_date ?? '',
            description: w.description ?? '',
            display_order: w.display_order == null ? '' : String(w.display_order),
        }));

    const newKeyPoints: Record<number, DraftItem<KeyPointDraft>[]> = {};
    for (const work of baselineWorks) {
        const workKeyPoints = baselineKeyPoints
            .filter((kp) => kp.work_experience_id === work.id)
            .sort(byDisplayOrder)
            .map((kp): DraftItem<KeyPointDraft> => ({
                id: kp.id,
                _status: 'existing' as DraftStatus,
                key_point: kp.key_point,
                display_order: kp.display_order == null ? '' : String(kp.display_order),
            }));
        newKeyPoints[work.id] = workKeyPoints;
    }
    keyPoints = newKeyPoints;
}

/**
 * Compute the diff between drafts and baseline for the save orchestrator.
 */
export function computeDiff(): WorkAction[] {
    const actions: WorkAction[] = [];

    // Process work experiences
    for (const draft of drafts) {
        if (draft._status === 'new') {
            actions.push({
                type: 'createWork',
                tempId: draft.id,
                payload: {
                    job_title: draft.job_title,
                    company_name: toNullable(draft.company_name),
                    start_date: draft.start_date,
                    end_date: toNullable(draft.end_date),
                    description: toNullable(draft.description),
                    display_order: toNumberOrNull(draft.display_order),
                },
            });
        } else if (draft._status === 'deleted') {
            // Skip delete actions for items that were never saved (new-then-deleted)
            if (draft.id < 0) continue;
            actions.push({ type: 'deleteWork', id: draft.id });
        } else if (draft._status === 'existing') {
            const baseline = baselineWorks.find((w) => w.id === draft.id);
            if (baseline) {
                const payload: UpdateWorkExperienceRequest = {};
                if (baseline.job_title !== draft.job_title) {
                    payload.job_title = draft.job_title;
                }
                if (baseline.company_name !== draft.company_name) {
                    payload.company_name = toNullable(draft.company_name);
                }
                if (baseline.start_date !== draft.start_date) {
                    payload.start_date = draft.start_date;
                }
                if (baseline.end_date !== draft.end_date) {
                    payload.end_date = toNullable(draft.end_date);
                }
                if (baseline.description !== draft.description) {
                    payload.description = toNullable(draft.description);
                }
                if (String(baseline.display_order ?? '') !== draft.display_order) {
                    payload.display_order = toNumberOrNull(draft.display_order);
                }

                if (Object.keys(payload).length > 0) {
                    actions.push({ type: 'updateWork', id: draft.id, payload });
                }
            }
        }
    }

    // Process key points
    for (const [workId, workKeyPoints] of Object.entries(keyPoints)) {
        const numWorkId = Number(workId);
        const baselineKeyPointsForWork = baselineKeyPoints.filter(
            (kp) => kp.work_experience_id === numWorkId
        );

        for (const kp of workKeyPoints) {
            if (kp._status === 'new') {
                actions.push({
                    type: 'createKeyPoint',
                    workId: numWorkId,
                    tempId: kp.id,
                    payload: {
                        key_point: kp.key_point,
                        display_order: toNumberOrNull(kp.display_order),
                    },
                });
            } else if (kp._status === 'deleted') {
                // Skip delete actions for items that were never saved (new-then-deleted)
                if (kp.id < 0) continue;
                actions.push({ type: 'deleteKeyPoint', id: kp.id });
            } else if (kp._status === 'existing') {
                const baseline = baselineKeyPointsForWork.find((b) => b.id === kp.id);
                if (baseline) {
                    const payload: UpdateWorkExperienceKeyPointRequest = {};
                    if (baseline.key_point !== kp.key_point) {
                        payload.key_point = kp.key_point;
                    }
                    if (String(baseline.display_order ?? '') !== kp.display_order) {
                        payload.display_order = toNumberOrNull(kp.display_order);
                    }

                    if (Object.keys(payload).length > 0) {
                        actions.push({ type: 'updateKeyPoint', id: kp.id, payload });
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
    // Update work experience IDs - only mark successful creations as existing
    drafts = drafts.map((d) => {
        if (d._status === 'new' && tempIdMap.has(d.id)) {
            return { ...d, id: tempIdMap.get(d.id)!, _status: 'existing' as DraftStatus };
        }
        if (d._status === 'deleted') {
            return null;
        }
        return d;
    }).filter((d): d is DraftItem<WorkDraft> => d !== null);

    // Update key point IDs - only mark successful creations as existing
    const newKeyPoints: Record<number, DraftItem<KeyPointDraft>[]> = {};
    for (const workId of Object.keys(keyPoints)) {
        const numWorkId = Number(workId);
        // Check if work ID was remapped
        const realWorkId = tempIdMap.get(numWorkId) ?? numWorkId;
        newKeyPoints[realWorkId] = keyPoints[numWorkId]
            .map((kp) => {
                if (kp._status === 'new' && tempIdMap.has(kp.id)) {
                    return { ...kp, id: tempIdMap.get(kp.id)!, _status: 'existing' as DraftStatus };
                }
                if (kp._status === 'deleted') {
                    return null;
                }
                return kp;
            })
            .filter((kp): kp is DraftItem<KeyPointDraft> => kp !== null);
    }
    keyPoints = newKeyPoints;

    // Update baseline to match current draft state for successful saves
    // Rebuild baseline from current drafts for existing items
    const resumeId = baselineWorks[0]?.resume_id ?? 0;

    baselineWorks = drafts
        .filter((d) => d._status === 'existing')
        .map((d) => {
            const existing = baselineWorks.find((bw) => bw.id === d.id);
            return {
                id: d.id,
                resume_id: existing?.resume_id ?? resumeId,
                job_title: d.job_title.trim(),
                company_name: d.company_name.trim(),
                start_date: d.start_date,
                end_date: toNullable(d.end_date),
                description: toNullable(d.description),
                display_order: toNumberOrNull(d.display_order),
                active: existing?.active ?? true,
                created_at: existing?.created_at ?? new Date().toISOString(),
            };
        });

    baselineKeyPoints = [];
    for (const workId of Object.keys(keyPoints)) {
        const numWorkId = Number(workId);
        const current = keyPoints[numWorkId];
        if (current) {
            for (const kp of current.filter((k) => k._status === 'existing')) {
                const existing = baselineKeyPoints.find((bkp) => bkp.id === kp.id);
                baselineKeyPoints.push({
                    id: kp.id,
                    work_experience_id: numWorkId,
                    key_point: kp.key_point.trim(),
                    display_order: toNumberOrNull(kp.display_order),
                    active: existing?.active ?? true,
                    created_at: existing?.created_at ?? new Date().toISOString(),
                });
            }
        }
    }
}

/**
 * Keep failed items in dirty state for retry.
 *
 * @param failedIds - Set of IDs that failed to save
 */
export function keepFailedItems(failedIds: Set<number>): void {
    // Keep work experiences with failed saves as-is, mark successful new items as existing
    drafts = drafts.map((d) => {
        if (failedIds.has(d.id)) {
            return d; // Keep status as-is
        }
        if (d._status === 'new') {
            return { ...d, _status: 'existing' as DraftStatus };
        }
        return d;
    });

    // Keep key points with failed saves as-is, mark successful new items as existing
    for (const workId of Object.keys(keyPoints)) {
        const numWorkId = Number(workId);
        keyPoints = {
            ...keyPoints,
            [numWorkId]: keyPoints[numWorkId].map((kp) => {
                if (failedIds.has(kp.id)) {
                    return kp; // Keep status as-is
                }
                if (kp._status === 'new') {
                    return { ...kp, _status: 'existing' as DraftStatus };
                }
                return kp;
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