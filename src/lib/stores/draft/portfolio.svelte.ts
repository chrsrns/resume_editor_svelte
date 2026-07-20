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
import { toNumberOrNull, toNullable } from './shared';

type ProjectDraft = {
    id: number;
    project_name: string;
    image_url: string;
    project_link: string;
    source_code_link: string;
    description: string;
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

const projectsStore = createDraftListStore<ProjectDraft, PortfolioProject>({
    toDraft: (p) => ({
        id: p.id,
        project_name: p.project_name,
        image_url: p.image_url ?? '',
        project_link: p.project_link ?? '',
        source_code_link: p.source_code_link ?? '',
        description: p.description ?? '',
        display_order: p.display_order == null ? '' : String(p.display_order),
        active: p.active
    }),
    toBaseline: (d, existing, meta) => ({
        id: d.id,
        resume_id: existing?.resume_id ?? meta?.resume_id ?? 0,
        project_name: d.project_name.trim(),
        image_url: toNullable(d.image_url),
        project_link: toNullable(d.project_link),
        source_code_link: toNullable(d.source_code_link),
        description: toNullable(d.description),
        display_order: toNumberOrNull(d.display_order),
        active: d.active,
        created_at: existing?.created_at ?? meta?.created_at ?? ''
    }),
    normalizeDraft: (d) => ({
        project_name: d.project_name,
        image_url: d.image_url,
        project_link: d.project_link,
        source_code_link: d.source_code_link,
        description: d.description,
        display_order: toNumberOrNull(d.display_order),
        active: d.active
    }),
    normalizeBaseline: (b) => ({
        project_name: b.project_name,
        image_url: b.image_url ?? '',
        project_link: b.project_link ?? '',
        source_code_link: b.source_code_link ?? '',
        description: b.description ?? '',
        display_order: b.display_order,
        active: b.active
    }),
    validate: (d) => {
        if (!d.project_name.trim()) return 'Project name is required';
        return null;
    },
    buildCreatePayload: (d) => ({
        project_name: d.project_name,
        image_url: toNullable(d.image_url),
        project_link: toNullable(d.project_link),
        source_code_link: toNullable(d.source_code_link),
        description: toNullable(d.description),
        display_order: toNumberOrNull(d.display_order),
        active: d.active
    }),
    buildUpdatePayload: (d, b) => {
        const payload: UpdatePortfolioProjectRequest = {};
        if (d.project_name !== b.project_name) {
            payload.project_name = d.project_name;
        }
        if (d.image_url !== b.image_url) {
            payload.image_url = toNullable(d.image_url);
        }
        if (d.project_link !== b.project_link) {
            payload.project_link = toNullable(d.project_link);
        }
        if (d.source_code_link !== b.source_code_link) {
            payload.source_code_link = toNullable(d.source_code_link);
        }
        if (d.description !== b.description) {
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
    actionType: { create: 'createProject', update: 'updateProject', delete: 'deleteProject' },
    getMeta: (b) => ({ resume_id: b.resume_id, created_at: b.created_at })
});

const keyPointsStore = createChildGroupStore<KeyPointDraft, PortfolioKeyPoint, 'projectId'>({
    toDraft: (kp) => ({
        id: kp.id,
        key_point: kp.key_point,
        display_order: kp.display_order == null ? '' : String(kp.display_order)
    }),
    toBaseline: (d, projectId, existing, meta) => ({
        id: d.id,
        portfolio_project_id: projectId,
        key_point: d.key_point.trim(),
        display_order: toNumberOrNull(d.display_order),
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
        const payload: UpdatePortfolioKeyPointRequest = {};
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
    getParentId: (kp) => kp.portfolio_project_id,
    parentIdField: 'projectId',
    getMeta: (kp) => ({ created_at: kp.created_at })
});

const technologiesStore = createChildGroupStore<TechnologyDraft, PortfolioTechnology, 'projectId'>({
    toDraft: (t) => ({
        id: t.id,
        technology_name: t.technology_name,
        display_order: t.display_order == null ? '' : String(t.display_order)
    }),
    toBaseline: (d, projectId, existing, meta) => ({
        id: d.id,
        portfolio_project_id: projectId,
        technology_name: d.technology_name.trim(),
        display_order: toNumberOrNull(d.display_order),
        created_at: existing?.created_at ?? meta?.created_at ?? ''
    }),
    normalizeDraft: (d) => ({ technology_name: d.technology_name }),
    normalizeBaseline: (b) => ({ technology_name: b.technology_name }),
    validate: (d) => {
        if (!d.technology_name.trim()) return 'Technology name is required';
        return null;
    },
    buildCreatePayload: (d) => ({
        technology_name: d.technology_name,
        display_order: toNumberOrNull(d.display_order)
    }),
    buildUpdatePayload: (d, b) => {
        const payload: UpdatePortfolioTechnologyRequest = {};
        if (d.technology_name !== b.technology_name) {
            payload.technology_name = d.technology_name;
        }
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
