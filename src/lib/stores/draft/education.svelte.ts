/**
 * Draft module for education with nested key points.
 *
 * Thin config + alias layer over `createParentChildSection`.
 */

import type {
    Education,
    EducationKeyPoint,
    NewEducationRequest,
    UpdateEducationRequest,
    NewEducationKeyPointRequest,
    UpdateEducationKeyPointRequest
} from '$lib/types';
import { parsePartialDate, validatePartialDate, isPartialDateRangeValid } from '$lib/types';
import { createDraftListStore, createChildGroupStore, createParentChildSection } from './draftStore.svelte';
import { toNumberOrNull, toNullable } from './shared';

type EducationDraft = {
    id: number;
    education_stage: string;
    institution_name: string;
    degree: string;
    start_date: string;
    end_date: string;
    description: string;
    display_order: string;
    active: boolean;
};

type KeyPointDraft = {
    id: number;
    key_point: string;
    display_order: string;
};

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

const educationStore = createDraftListStore<EducationDraft, Education>({
    toDraft: (e) => ({
        id: e.id,
        education_stage: e.education_stage,
        institution_name: e.institution_name,
        degree: String(e.degree ?? ''),
        start_date: e.start_date,
        end_date: e.end_date ?? '',
        description: e.description ?? '',
        display_order: e.display_order == null ? '' : String(e.display_order),
        active: e.active
    }),
    toBaseline: (d, existing, meta) => ({
        id: d.id,
        resume_id: existing?.resume_id ?? meta?.resume_id ?? 0,
        education_stage: d.education_stage.trim(),
        institution_name: d.institution_name.trim(),
        degree: toNullable(d.degree),
        start_date: d.start_date,
        end_date: toNullable(d.end_date),
        description: toNullable(d.description),
        display_order: toNumberOrNull(d.display_order),
        active: d.active,
        created_at: existing?.created_at ?? meta?.created_at ?? ''
    }),
    normalizeDraft: (d) => ({
        education_stage: d.education_stage.trim(),
        institution_name: d.institution_name.trim(),
        degree: toNullable(d.degree),
        start_date: d.start_date,
        end_date: toNullable(d.end_date),
        description: toNullable(d.description),
        active: d.active
    }),
    normalizeBaseline: (b) => ({
        education_stage: b.education_stage,
        institution_name: b.institution_name,
        degree: b.degree,
        start_date: b.start_date,
        end_date: b.end_date,
        description: b.description,
        active: b.active
    }),
    validate: (d) => {
        const errors: string[] = [];

        if (!d.education_stage.trim()) {
            errors.push('Education stage is required');
        }

        if (!d.institution_name.trim()) {
            errors.push('Institution name is required');
        }

        const startDateError = validatePartialDate(parsePartialDate(d.start_date));
        if (startDateError) {
            errors.push(`Start date: ${startDateError}`);
        }

        if (d.end_date.trim()) {
            const endDateError = validatePartialDate(parsePartialDate(d.end_date));
            if (endDateError) {
                errors.push(`End date: ${endDateError}`);
            }
        }

        if (!startDateError && !errors.some((e) => e.startsWith('End date:'))) {
            if (!isPartialDateRangeValid(d.start_date, d.end_date)) {
                errors.push('End date must be on or after start date');
            }
        }

        return errors.length > 0 ? errors.join('; ') : null;
    },
    buildCreatePayload: (d) => ({
        education_stage: d.education_stage.trim(),
        institution_name: d.institution_name.trim(),
        degree: toNullable(d.degree),
        start_date: d.start_date,
        end_date: toNullable(d.end_date),
        description: toNullable(d.description),
        display_order: toNumberOrNull(d.display_order),
        active: d.active
    }),
    buildUpdatePayload: (d, b) => {
        const payload: UpdateEducationRequest = {};
        if (d.education_stage.trim() !== b.education_stage) {
            payload.education_stage = d.education_stage.trim();
        }
        if (d.institution_name.trim() !== b.institution_name) {
            payload.institution_name = d.institution_name.trim();
        }
        if (toNullable(d.degree) !== b.degree) {
            payload.degree = toNullable(d.degree);
        }
        if (d.start_date !== b.start_date) {
            payload.start_date = d.start_date;
        }
        if (toNullable(d.end_date) !== b.end_date) {
            payload.end_date = toNullable(d.end_date);
        }
        if (toNullable(d.description) !== b.description) {
            payload.description = toNullable(d.description);
        }
        const newOrder = toNumberOrNull(d.display_order);
        if (newOrder !== b.display_order) {
            payload.display_order = newOrder;
        }
        if (d.active !== b.active) {
            payload.active = d.active;
        }
        return payload;
    },
    actionType: { create: 'createEducation', update: 'updateEducation', delete: 'deleteEducation' },
    getMeta: (b) => ({ resume_id: b.resume_id, created_at: b.created_at })
});

const keyPointsStore = createChildGroupStore<KeyPointDraft, EducationKeyPoint, 'educationId'>({
    toDraft: (kp) => ({
        id: kp.id,
        key_point: kp.key_point,
        display_order: kp.display_order == null ? '' : String(kp.display_order)
    }),
    toBaseline: (d, educationId, existing, meta) => ({
        id: d.id,
        education_id: educationId,
        key_point: d.key_point.trim(),
        display_order: toNumberOrNull(d.display_order),
        created_at: existing?.created_at ?? meta?.created_at ?? ''
    }),
    normalizeDraft: (d) => ({ key_point: d.key_point.trim() }),
    normalizeBaseline: (b) => ({ key_point: b.key_point }),
    validate: (d) => {
        if (!d.key_point.trim()) return 'Key point is required';
        return null;
    },
    buildCreatePayload: (d) => ({
        key_point: d.key_point.trim(),
        display_order: toNumberOrNull(d.display_order)
    }),
    buildUpdatePayload: (d, b) => {
        const payload: UpdateEducationKeyPointRequest = {};
        if (d.key_point.trim() !== b.key_point) {
            payload.key_point = d.key_point.trim();
        }
        const newOrder = toNumberOrNull(d.display_order);
        if (newOrder !== b.display_order) {
            payload.display_order = newOrder;
        }
        return payload;
    },
    actionType: { create: 'createKeyPoint', update: 'updateKeyPoint', delete: 'deleteKeyPoint' },
    getParentId: (kp) => kp.education_id,
    parentIdField: 'educationId',
    getMeta: (kp) => ({ created_at: kp.created_at })
});

const section = createParentChildSection(educationStore, {
    keyPoints: { label: 'Key point', store: keyPointsStore }
}, 'Education');

export const initialize = (educations: Education[], keyPoints: EducationKeyPoint[]): void =>
    section.initialize(educations, { keyPoints });

export const getDrafts = educationStore.getDrafts;
export const getVisibleDrafts = educationStore.getVisibleDrafts;
export const getBaseline = educationStore.getBaseline;
export const getBaselineKeyPoints = keyPointsStore.getBaseline;

export const addEducation = section.addParent;
export const updateEducation = educationStore.update;
export const removeEducation = section.removeParent;
export const reorderEducation = educationStore.reorder;
export const reorder = educationStore.reorder;

export const validateEducation = educationStore.validate;
export const validateKeyPoint = keyPointsStore.validateChild;

export const validateAll = section.validateAll;
export const getValidationErrors = section.getValidationErrors;
export const isDirty = section.isDirty;
export const resetToBaseline = section.resetToBaseline;
export const applySaveResults = section.applySaveResults;
export const commitBaseline = section.commitBaseline;

export const addKeyPoint = keyPointsStore.addChild;
export const updateKeyPoint = keyPointsStore.updateChild;
export const removeKeyPoint = keyPointsStore.removeChild;
export const reorderKeyPoint = keyPointsStore.reorderChildren;

export const getKeyPoints = keyPointsStore.getChildren;
export const getVisibleKeyPoints = keyPointsStore.getVisibleChildren;

export const getSaving = educationStore.getSaving;
export const setSaving = educationStore.setSaving;
export const getError = educationStore.getError;
export const setError = educationStore.setError;

export function computeDiff(): EducationAction[] {
    return section.computeDiff() as unknown as EducationAction[];
}
