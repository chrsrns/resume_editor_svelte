/**
 * Draft module for skills.
 *
 * This is now a thin configuration layer over `createDraftListStore`.
 */

import type { Skill, NewSkillRequest, UpdateSkillRequest } from '$lib/types';
import { createDraftListStore } from './draftStore.svelte';
import { toNumberOrNull } from './shared';
import { defineFields } from './fields';

type SkillDraft = {
    id: number;
    skill_name: string;
    confidence_percentage: string;
    display_order: string;
};

export type SkillAction =
    | { type: 'create'; tempId: number; payload: NewSkillRequest }
    | { type: 'update'; id: number; payload: UpdateSkillRequest }
    | { type: 'delete'; id: number };

const skillFields = defineFields<SkillDraft, Skill>()({
    skill_name: { kind: 'required-trim' },
    confidence_percentage: { kind: 'num-required' }
});

const store = createDraftListStore<SkillDraft, Skill>({
    toDraft: (s) => ({
        id: s.id,
        ...skillFields.toDraft(s),
        display_order: s.display_order == null ? '' : String(s.display_order)
    }),
    toBaseline: (d, existing, meta) => ({
        id: d.id,
        resume_id: existing?.resume_id ?? meta?.resume_id ?? '',
        ...skillFields.toBaseline(d),
        display_order: toNumberOrNull(d.display_order),
        created_at: existing?.created_at ?? meta?.created_at ?? ''
    }),
    normalizeDraft: skillFields.normalizeDraft,
    normalizeBaseline: skillFields.normalizeBaseline,
    validate: (d) => {
        if (!d.skill_name.trim()) return 'Skill name is required';
        if (d.confidence_percentage.trim() === '') return 'Confidence is required';
        const confidence = Number(d.confidence_percentage);
        if (Number.isNaN(confidence) || confidence < 0 || confidence > 100) {
            return 'Confidence must be 0–100';
        }
        return null;
    },
    buildCreatePayload: (d) => ({
        ...skillFields.buildCreatePayload(d),
        display_order: toNumberOrNull(d.display_order)
    }),
    buildUpdatePayload: (d, b) => {
        const payload = skillFields.buildUpdatePayload(d, b) as UpdateSkillRequest;
        const newOrder = toNumberOrNull(d.display_order);
        if (newOrder !== b.display_order) {
            payload.display_order = newOrder;
        }
        return payload;
    },
    actionType: { create: 'create', update: 'update', delete: 'delete' },
    validateOnAdd: true,
    getMeta: (b) => ({ resume_id: b.resume_id, created_at: b.created_at })
});

export const initialize = store.initialize;
export const getDrafts = store.getDrafts;
export const getVisibleDrafts = store.getVisibleDrafts;
export const getBaseline = store.getBaseline;
export const add = store.add;
export const update = store.update;
export const remove = store.remove;
export const reorder = store.reorder;
export const validate = store.validate;
export const validateAll = store.validateAll;
export const getValidationErrors = store.getValidationErrors;
export const isDirty = store.isDirty;
export const resetToBaseline = store.resetToBaseline;
export const applySaveResults = store.applySaveResults;
export const commitBaseline = store.commitBaseline;
export const setSaving = store.setSaving;
export const getSaving = store.getSaving;
export const setError = store.setError;
export const getError = store.getError;
export const computeDiff = (): SkillAction[] => store.computeDiff() as SkillAction[];
