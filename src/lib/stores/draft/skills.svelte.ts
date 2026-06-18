/**
 * Draft module for skills.
 *
 * This module manages the draft state for the skills section,
 * which is a flat list of skill items with confidence percentages.
 */

import type { Skill, NewSkillRequest, UpdateSkillRequest } from '$lib/types';
import {
    type DraftItem,
    type DraftStatus,
    generateTempId,
    computeSignature,
    setValidationError,
    toNumberOrNull
} from './shared';
import { byDisplayOrder } from '$lib/components/sections/shared/displayOrderReorder';

/**
 * Draft data shape for a skill.
 * All fields are strings for easier form binding.
 * The id field is included for tracking.
 */
type SkillDraft = {
    id: number;
    skill_name: string;
    confidence_percentage: string;
    display_order: string;
};

/**
 * Baseline data shape (matches server response).
 */
type BaselineSkill = Skill;

/**
 * Action type for save orchestrator.
 */
export type SkillAction =
    | { type: 'create'; tempId: number; payload: NewSkillRequest }
    | { type: 'update'; id: number; payload: UpdateSkillRequest }
    | { type: 'delete'; id: number };

/**
 * Result of a save operation.
 */
export type SkillActionResult = {
    action: SkillAction;
    success: boolean;
    realId?: number;
    error?: string;
};

// State
let baselineSkills: BaselineSkill[] = [];
let drafts = $state<DraftItem<SkillDraft>[]>([]);
let saving = $state(false);
let error = $state<string | null>(null);

/**
 * Initialize the draft module with server data.
 *
 * @param skills - The skills data from the server
 */
export function initialize(skills: Skill[]): void {
    baselineSkills = [...skills];
    drafts = skills
        .sort(byDisplayOrder)
        .map((s) => ({
            id: s.id,
            _status: 'existing',
            skill_name: s.skill_name,
            confidence_percentage: String(s.confidence_percentage),
            display_order: s.display_order == null ? '' : String(s.display_order),
        }));
}

/**
 * Get all draft items (including deleted ones).
 */
export function getDrafts(): DraftItem<SkillDraft>[] {
    return drafts;
}

/**
 * Get visible draft items (excluding deleted ones).
 */
export function getVisibleDrafts(): DraftItem<SkillDraft>[] {
    return drafts.filter((d) => d._status !== 'deleted');
}

/**
 * Get the baseline server data.
 */
export function getBaseline(): BaselineSkill[] {
    return baselineSkills;
}

/**
 * Add a new skill draft.
 *
 * @param draft - The skill data (without id and display_order)
 */
export function add(draft: Omit<SkillDraft, 'id' | 'display_order'>): void {
    drafts = [
        ...drafts,
        {
            id: generateTempId(),
            _status: 'new',
            ...draft,
            display_order: '',
        },
    ];
}

/**
 * Update an existing skill draft.
 *
 * @param id - The skill ID (real or temp)
 * @param partial - Partial data to update
 */
export function update(id: number, partial: Partial<SkillDraft>): void {
    drafts = drafts.map((d) => (d.id === id ? { ...d, ...partial } : d));
}

/**
 * Remove a skill draft (marks as deleted).
 *
 * @param id - The skill ID (real or temp)
 */
export function remove(id: number): void {
    drafts = drafts.map((d) =>
        d.id === id ? { ...d, _status: 'deleted' as DraftStatus } : d
    );
}

/**
 * Reorder skills locally.
 *
 * @param fromId - The ID of the item to move
 * @param toId - The ID of the target position
 */
export function reorder(fromId: number, toId: number): void {
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
        display_order: String((i + 1) * 10),
    }));

    // Merge back with deleted items
    const deleted = drafts.filter((d) => d._status === 'deleted');
    drafts = [...updated, ...deleted];
}

/**
 * Validate a specific skill draft.
 *
 * @param id - The skill ID to validate
 * @returns true if valid, false otherwise
 */
export function validate(id: number): boolean {
    const draft = drafts.find((d) => d.id === id);
    if (!draft) return false;

    let valid = true;

    if (!draft.skill_name.trim()) {
        drafts = drafts.map((d) =>
            d.id === id ? setValidationError(d, 'Skill name is required') : d
        );
        valid = false;
    }

    const confidence = Number(draft.confidence_percentage);
    if (isNaN(confidence) || confidence < 0 || confidence > 100) {
        drafts = drafts.map((d) =>
            d.id === id ? setValidationError(d, 'Confidence must be 0–100') : d
        );
        valid = false;
    }

    if (valid) {
        drafts = drafts.map((d) => (d.id === id ? setValidationError(d, null) : d));
    }

    return valid;
}

/**
 * Check if any draft has unsaved changes compared to the baseline.
 */
export function isDirty(): boolean {
    const baselineSig = computeSignature(
        baselineSkills
            .sort(byDisplayOrder)
            .map((s) => ({
                skill_name: s.skill_name,
                confidence_percentage: s.confidence_percentage,
                display_order: s.display_order,
            }))
    );
    const draftSig = computeSignature(
        drafts
            .filter((d) => d._status !== 'deleted')
            .map((d) => ({ ...d, display_order: toNumberOrNull(d.display_order) ?? null }))
            .sort(byDisplayOrder)
            .map((d) => ({
                skill_name: d.skill_name.trim(),
                confidence_percentage: Number(d.confidence_percentage),
                display_order: d.display_order,
            }))
    );
    return baselineSig !== draftSig || drafts.some((d) => d._status === 'new');
}

/**
 * Get all validation error messages.
 */
export function getValidationErrors(): string[] {
    return drafts.filter((d) => d._validationError).map((d) => d._validationError!);
}

/**
 * Reset all drafts to the baseline server data.
 */
export function resetToBaseline(): void {
    initialize(baselineSkills);
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
export function computeDiff(): SkillAction[] {
    const actions: SkillAction[] = [];

    for (const draft of drafts) {
        if (draft._status === 'new') {
            actions.push({
                type: 'create',
                tempId: draft.id,
                payload: {
                    skill_name: draft.skill_name.trim(),
                    confidence_percentage: Number(draft.confidence_percentage),
                    display_order: toNumberOrNull(draft.display_order),
                },
            });
        } else if (draft._status === 'deleted') {
            // Skip delete actions for items that were never saved (new-then-deleted)
            if (draft.id < 0) continue;
            actions.push({ type: 'delete', id: draft.id });
        } else if (draft._status === 'existing') {
            const baseline = baselineSkills.find((b) => b.id === draft.id);
            if (!baseline) continue;

            const payload: UpdateSkillRequest = {};
            if (draft.skill_name.trim() !== baseline.skill_name) {
                payload.skill_name = draft.skill_name.trim();
            }
            if (Number(draft.confidence_percentage) !== baseline.confidence_percentage) {
                payload.confidence_percentage = Number(draft.confidence_percentage);
            }
            const newOrder = toNumberOrNull(draft.display_order);
            if (newOrder !== baseline.display_order) {
                payload.display_order = newOrder;
            }

            if (Object.keys(payload).length > 0) {
                actions.push({ type: 'update', id: draft.id, payload });
            }
        }
    }

    return actions;
}

/**
 * Apply successful save results.
 *
 * @param tempIdMap - Map of temp IDs to real server IDs
 */
export function applySaveResults(tempIdMap: Map<number, number>): void {
    // Only mark successful creations as existing
    drafts = drafts
        .filter((d) => d._status !== 'deleted')
        .map((d) => {
            if (d._status === 'new' && tempIdMap.has(d.id)) {
                return { ...d, id: tempIdMap.get(d.id)!, _status: 'existing' as DraftStatus };
            }
            return d;
        });

    // Remove deleted items from baseline
    baselineSkills = baselineSkills.filter(bs =>
        !drafts.find(d => d.id === bs.id && d._status === 'deleted')
    );
}

/**
 * Keep failed items in dirty state for retry.
 *
 * @param failedIds - Set of IDs that failed to save
 */
export function keepFailedItems(failedIds: Set<number>): void {
    drafts = drafts.map((d) =>
        failedIds.has(d.id) ? d : { ...d, _status: 'existing' as DraftStatus }
    );
}