/**
 * Draft module for work experience with nested key points.
 *
 * Thin config + alias layer over `createParentChildSection`.
 */

import type {
    WorkExperience,
    WorkExperienceKeyPoint,
    NewWorkExperienceRequest,
    UpdateWorkExperienceRequest,
    NewWorkExperienceKeyPointRequest,
    UpdateWorkExperienceKeyPointRequest
} from '$lib/types';
import { parsePartialDate, validatePartialDate, isPartialDateRangeValid } from '$lib/types';
import {
    createDraftListStore,
    createChildGroupStore,
    createParentChildSection
} from './draftStore.svelte';
import { toNumberOrNull, toNullable } from './shared';

type WorkDraft = {
    id: number;
    job_title: string;
    company_name: string;
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

export type WorkAction =
    | { type: 'createWork'; tempId: number; payload: NewWorkExperienceRequest }
    | { type: 'updateWork'; id: number; payload: UpdateWorkExperienceRequest }
    | { type: 'deleteWork'; id: number }
    | {
          type: 'createKeyPoint';
          workId: number;
          tempId: number;
          payload: NewWorkExperienceKeyPointRequest;
      }
    | { type: 'updateKeyPoint'; id: number; payload: UpdateWorkExperienceKeyPointRequest }
    | { type: 'deleteKeyPoint'; id: number };

const workStore = createDraftListStore<WorkDraft, WorkExperience>({
    toDraft: (w) => ({
        id: w.id,
        job_title: w.job_title,
        company_name: w.company_name ?? '',
        start_date: w.start_date,
        end_date: w.end_date ?? '',
        description: w.description ?? '',
        display_order: w.display_order == null ? '' : String(w.display_order),
        active: w.active
    }),
    toBaseline: (d, existing, meta) => ({
        id: d.id,
        resume_id: existing?.resume_id ?? meta?.resume_id ?? 0,
        job_title: d.job_title,
        company_name: toNullable(d.company_name),
        start_date: d.start_date,
        end_date: toNullable(d.end_date),
        description: toNullable(d.description),
        display_order: toNumberOrNull(d.display_order),
        active: d.active,
        created_at: existing?.created_at ?? meta?.created_at ?? ''
    }),
    normalizeDraft: (d) => ({
        job_title: d.job_title,
        company_name: d.company_name,
        start_date: d.start_date,
        end_date: d.end_date,
        description: d.description,
        active: d.active
    }),
    normalizeBaseline: (b) => ({
        job_title: b.job_title,
        company_name: b.company_name ?? '',
        start_date: b.start_date,
        end_date: b.end_date ?? '',
        description: b.description ?? '',
        active: b.active
    }),
    validate: (d) => {
        const errors: string[] = [];

        if (!d.job_title.trim()) {
            errors.push('Job title is required');
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
        job_title: d.job_title,
        company_name: toNullable(d.company_name),
        start_date: d.start_date,
        end_date: toNullable(d.end_date),
        description: toNullable(d.description),
        display_order: toNumberOrNull(d.display_order),
        active: d.active
    }),
    buildUpdatePayload: (d, b) => {
        const payload: UpdateWorkExperienceRequest = {};
        if (d.job_title !== b.job_title) {
            payload.job_title = d.job_title;
        }
        if (toNullable(d.company_name) !== b.company_name) {
            payload.company_name = toNullable(d.company_name);
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
    actionType: { create: 'createWork', update: 'updateWork', delete: 'deleteWork' },
    getMeta: (b) => ({ resume_id: b.resume_id, created_at: b.created_at })
});

const keyPointsStore = createChildGroupStore<KeyPointDraft, WorkExperienceKeyPoint, 'workId'>({
    toDraft: (kp) => ({
        id: kp.id,
        key_point: kp.key_point,
        display_order: kp.display_order == null ? '' : String(kp.display_order)
    }),
    toBaseline: (d, workId, existing, meta) => ({
        id: d.id,
        work_experience_id: workId,
        key_point: d.key_point.trim(),
        display_order: toNumberOrNull(d.display_order),
        active: existing?.active ?? true,
        created_at: existing?.created_at ?? meta?.created_at ?? ''
    }),
    normalizeDraft: (d) => ({ key_point: d.key_point }),
    normalizeBaseline: (b) => ({ key_point: b.key_point }),
    validate: (d) => {
        if (!d.key_point.trim()) return 'Key point is required';
        return null;
    },
    buildCreatePayload: (d) => ({
        key_point: d.key_point,
        display_order: toNumberOrNull(d.display_order)
    }),
    buildUpdatePayload: (d, b) => {
        const payload: UpdateWorkExperienceKeyPointRequest = {};
        if (d.key_point !== b.key_point) {
            payload.key_point = d.key_point;
        }
        const newOrder = toNumberOrNull(d.display_order);
        if (newOrder !== b.display_order) {
            payload.display_order = newOrder;
        }
        return payload;
    },
    actionType: { create: 'createKeyPoint', update: 'updateKeyPoint', delete: 'deleteKeyPoint' },
    getParentId: (kp) => kp.work_experience_id,
    parentIdField: 'workId',
    getMeta: (kp) => ({ created_at: kp.created_at })
});

const section = createParentChildSection(
    workStore,
    {
        keyPoints: { label: 'Key point', store: keyPointsStore }
    },
    'Work experience'
);

export const initialize = (works: WorkExperience[], keyPoints: WorkExperienceKeyPoint[]): void =>
    section.initialize(works, { keyPoints });

export const getDrafts = workStore.getDrafts;
export const getVisibleDrafts = workStore.getVisibleDrafts;
export const getBaseline = workStore.getBaseline;
export const getBaselineKeyPoints = keyPointsStore.getBaseline;

export const addWork = section.addParent;
export const updateWork = workStore.update;
export const removeWork = section.removeParent;
export const reorder = workStore.reorder;

export const validateWork = workStore.validate;
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
export const reorderKeyPoints = keyPointsStore.reorderChildren;

export const getKeyPoints = keyPointsStore.getChildren;
export const getVisibleKeyPoints = keyPointsStore.getVisibleChildren;

export const getSaving = workStore.getSaving;
export const setSaving = workStore.setSaving;
export const getError = workStore.getError;
export const setError = workStore.setError;

export function computeDiff(): WorkAction[] {
    return section.computeDiff() as unknown as WorkAction[];
}
