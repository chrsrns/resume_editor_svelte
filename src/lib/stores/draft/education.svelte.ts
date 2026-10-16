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
import {
    createDraftListStore,
    createChildGroupStore,
    createParentChildSection
} from './draftStore.svelte';
import { toNumberOrNull } from './shared';
import { defineFields } from './fields';

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

const educationFields = defineFields<EducationDraft, Education>()({
    education_stage: { kind: 'required-trim' },
    institution_name: { kind: 'required-trim' },
    degree: { kind: 'optional-nullable' },
    start_date: { kind: 'required-raw' },
    end_date: { kind: 'optional-nullable' },
    description: { kind: 'optional-nullable' },
    active: { kind: 'bool' }
});

const educationStore = createDraftListStore<EducationDraft, Education>({
    toDraft: (e) => ({
        id: e.id,
        ...educationFields.toDraft(e),
        display_order: e.display_order == null ? '' : String(e.display_order)
    }),
    toBaseline: (d, existing, meta) => ({
        id: d.id,
        resume_id: existing?.resume_id ?? meta?.resume_id ?? '',
        ...educationFields.toBaseline(d),
        display_order: toNumberOrNull(d.display_order),
        created_at: existing?.created_at ?? meta?.created_at ?? ''
    }),
    normalizeDraft: educationFields.normalizeDraft,
    normalizeBaseline: educationFields.normalizeBaseline,
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
        ...educationFields.buildCreatePayload(d),
        display_order: toNumberOrNull(d.display_order)
    }),
    buildUpdatePayload: (d, b) => {
        const payload = educationFields.buildUpdatePayload(d, b) as UpdateEducationRequest;
        const newOrder = toNumberOrNull(d.display_order);
        if (newOrder !== b.display_order) {
            payload.display_order = newOrder;
        }
        return payload;
    },
    actionType: { create: 'createEducation', update: 'updateEducation', delete: 'deleteEducation' },
    getMeta: (b) => ({ resume_id: b.resume_id, created_at: b.created_at })
});

const keyPointFields = defineFields<KeyPointDraft, EducationKeyPoint>()({
    key_point: { kind: 'required-trim' }
});

const keyPointsStore = createChildGroupStore<KeyPointDraft, EducationKeyPoint, 'educationId'>({
    toDraft: (kp) => ({
        id: kp.id,
        ...keyPointFields.toDraft(kp),
        display_order: kp.display_order == null ? '' : String(kp.display_order)
    }),
    toBaseline: (d, educationId, existing, meta) => ({
        id: d.id,
        education_id: educationId,
        ...keyPointFields.toBaseline(d),
        display_order: toNumberOrNull(d.display_order),
        created_at: existing?.created_at ?? meta?.created_at ?? ''
    }),
    normalizeDraft: keyPointFields.normalizeDraft,
    normalizeBaseline: keyPointFields.normalizeBaseline,
    validate: (d) => {
        if (!d.key_point.trim()) return 'Key point is required';
        return null;
    },
    buildCreatePayload: (d) => ({
        ...keyPointFields.buildCreatePayload(d),
        display_order: toNumberOrNull(d.display_order)
    }),
    buildUpdatePayload: (d, b) => {
        const payload = keyPointFields.buildUpdatePayload(d, b) as UpdateEducationKeyPointRequest;
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

const section = createParentChildSection(
    educationStore,
    {
        keyPoints: { label: 'Key point', store: keyPointsStore }
    },
    'Education'
);

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
