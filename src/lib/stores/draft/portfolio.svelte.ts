/**
 * Draft module for portfolio with nested key points and technologies.
 *
 * Thin config + alias layer over `createParentChildSection`.
 */

import type {
    PortfolioProject,
    PortfolioKeyPoint,
    PortfolioTechnology,
    NewPortfolioProjectRequest,
    UpdatePortfolioProjectRequest,
    NewPortfolioKeyPointRequest,
    UpdatePortfolioKeyPointRequest,
    NewPortfolioTechnologyRequest,
    UpdatePortfolioTechnologyRequest
} from '$lib/types';
import {
    createDraftListStore,
    createChildGroupStore,
    createParentChildSection
} from './draftStore.svelte';
import { toNumberOrNull } from './shared';
import { defineFields } from './fields';

export type ProjectDraft = {
    id: number;
    project_name: string;
    image_url: string;
    project_link: string;
    source_code_link: string;
    description: string;
    video_url: string;
    display_order: string;
    active: boolean;
};

type KeyPointDraft = {
    id: number;
    key_point: string;
    display_order: string;
};

type TechnologyDraft = {
    id: number;
    technology_name: string;
    display_order: string;
};

export type PortfolioAction =
    | { type: 'createProject'; tempId: number; payload: NewPortfolioProjectRequest }
    | { type: 'updateProject'; id: number; payload: UpdatePortfolioProjectRequest }
    | { type: 'deleteProject'; id: number }
    | {
          type: 'createKeyPoint';
          projectId: number;
          tempId: number;
          payload: NewPortfolioKeyPointRequest;
      }
    | { type: 'updateKeyPoint'; id: number; payload: UpdatePortfolioKeyPointRequest }
    | { type: 'deleteKeyPoint'; id: number }
    | {
          type: 'createTechnology';
          projectId: number;
          tempId: number;
          payload: NewPortfolioTechnologyRequest;
      }
    | { type: 'updateTechnology'; id: number; payload: UpdatePortfolioTechnologyRequest }
    | { type: 'deleteTechnology'; id: number };

const projectFields = defineFields<ProjectDraft, PortfolioProject>()({
    project_name: { kind: 'required-trim' },
    image_url: { kind: 'optional-nullable' },
    project_link: { kind: 'optional-nullable' },
    source_code_link: { kind: 'optional-nullable' },
    description: { kind: 'optional-nullable' },
    video_url: { kind: 'optional-nullable' },
    active: { kind: 'bool' }
});

const projectsStore = createDraftListStore<ProjectDraft, PortfolioProject>({
    toDraft: (p) => ({
        id: p.id,
        ...projectFields.toDraft(p),
        display_order: p.display_order == null ? '' : String(p.display_order)
    }),
    toBaseline: (d, existing, meta) => ({
        id: d.id,
        resume_id: existing?.resume_id ?? meta?.resume_id ?? 0,
        ...projectFields.toBaseline(d),
        display_order: toNumberOrNull(d.display_order),
        created_at: existing?.created_at ?? meta?.created_at ?? ''
    }),
    normalizeDraft: projectFields.normalizeDraft,
    normalizeBaseline: projectFields.normalizeBaseline,
    validate: (d) => {
        if (!d.project_name.trim()) return 'Project name is required';
        if (d.video_url.trim().length > 500) return 'Video URL must be 500 characters or less';
        return null;
    },
    buildCreatePayload: (d) => ({
        ...projectFields.buildCreatePayload(d),
        display_order: toNumberOrNull(d.display_order)
    }),
    buildUpdatePayload: (d, b) => {
        const payload = projectFields.buildUpdatePayload(d, b) as UpdatePortfolioProjectRequest;
        const newOrder = toNumberOrNull(d.display_order);
        if (newOrder !== b.display_order) {
            payload.display_order = newOrder;
        }
        return payload;
    },
    actionType: { create: 'createProject', update: 'updateProject', delete: 'deleteProject' },
    getMeta: (b) => ({ resume_id: b.resume_id, created_at: b.created_at })
});

const keyPointFields = defineFields<KeyPointDraft, PortfolioKeyPoint>()({
    key_point: { kind: 'required-trim' }
});

const keyPointsStore = createChildGroupStore<KeyPointDraft, PortfolioKeyPoint, 'projectId'>({
    toDraft: (kp) => ({
        id: kp.id,
        ...keyPointFields.toDraft(kp),
        display_order: kp.display_order == null ? '' : String(kp.display_order)
    }),
    toBaseline: (d, projectId, existing, meta) => ({
        id: d.id,
        portfolio_project_id: projectId,
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
        const payload = keyPointFields.buildUpdatePayload(d, b) as UpdatePortfolioKeyPointRequest;
        const newOrder = toNumberOrNull(d.display_order);
        if (newOrder !== b.display_order) {
            payload.display_order = newOrder;
        }
        return payload;
    },
    actionType: { create: 'createKeyPoint', update: 'updateKeyPoint', delete: 'deleteKeyPoint' },
    getParentId: (kp) => kp.portfolio_project_id,
    parentIdField: 'projectId',
    getMeta: (kp) => ({ created_at: kp.created_at })
});

const technologyFields = defineFields<TechnologyDraft, PortfolioTechnology>()({
    technology_name: { kind: 'required-trim' }
});

const technologiesStore = createChildGroupStore<TechnologyDraft, PortfolioTechnology, 'projectId'>({
    toDraft: (t) => ({
        id: t.id,
        ...technologyFields.toDraft(t),
        display_order: t.display_order == null ? '' : String(t.display_order)
    }),
    toBaseline: (d, projectId, existing, meta) => ({
        id: d.id,
        portfolio_project_id: projectId,
        ...technologyFields.toBaseline(d),
        display_order: toNumberOrNull(d.display_order),
        created_at: existing?.created_at ?? meta?.created_at ?? ''
    }),
    normalizeDraft: technologyFields.normalizeDraft,
    normalizeBaseline: technologyFields.normalizeBaseline,
    validate: (d) => {
        if (!d.technology_name.trim()) return 'Technology name is required';
        return null;
    },
    buildCreatePayload: (d) => ({
        ...technologyFields.buildCreatePayload(d),
        display_order: toNumberOrNull(d.display_order)
    }),
    buildUpdatePayload: (d, b) => {
        const payload = technologyFields.buildUpdatePayload(d, b) as UpdatePortfolioTechnologyRequest;
        const newOrder = toNumberOrNull(d.display_order);
        if (newOrder !== b.display_order) {
            payload.display_order = newOrder;
        }
        return payload;
    },
    actionType: {
        create: 'createTechnology',
        update: 'updateTechnology',
        delete: 'deleteTechnology'
    },
    getParentId: (t) => t.portfolio_project_id,
    parentIdField: 'projectId',
    getMeta: (t) => ({ created_at: t.created_at })
});

const section = createParentChildSection(
    projectsStore,
    {
        keyPoints: { label: 'Key point', store: keyPointsStore },
        technologies: { label: 'Technology', store: technologiesStore }
    },
    'Project'
);

export const initialize = (
    projects: PortfolioProject[],
    keyPointList: PortfolioKeyPoint[],
    technologyList: PortfolioTechnology[]
): void => section.initialize(projects, { keyPoints: keyPointList, technologies: technologyList });

export const getDrafts = projectsStore.getDrafts;
export const getVisibleDrafts = projectsStore.getVisibleDrafts;
export const getBaseline = projectsStore.getBaseline;
export const getBaselineKeyPoints = keyPointsStore.getBaseline;
export const getBaselineTechnologies = technologiesStore.getBaseline;

export const addProject = section.addParent;
export const updateProject = projectsStore.update;
export const removeProject = section.removeParent;
export const reorder = projectsStore.reorder;

export const validateProject = projectsStore.validate;
export const validateKeyPoint = keyPointsStore.validateChild;
export const validateTechnology = technologiesStore.validateChild;

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

export const addTechnology = technologiesStore.addChild;
export const updateTechnology = technologiesStore.updateChild;
export const removeTechnology = technologiesStore.removeChild;
export const reorderTechnologies = technologiesStore.reorderChildren;

export const getTechnologies = technologiesStore.getChildren;
export const getVisibleTechnologies = technologiesStore.getVisibleChildren;

export const getSaving = projectsStore.getSaving;
export const setSaving = projectsStore.setSaving;
export const getError = projectsStore.getError;
export const setError = projectsStore.setError;

export function computeDiff(): PortfolioAction[] {
    return section.computeDiff() as unknown as PortfolioAction[];
}
