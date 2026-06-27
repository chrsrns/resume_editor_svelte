/**
 * Draft module for portfolio with nested key points and technologies.
 *
 * This module manages the draft state for the portfolio section,
 * which includes portfolio projects and their nested key points and technologies.
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
 * Draft data shape for a portfolio project.
 * All fields are strings for easier form binding.
 */
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

/**
 * Draft data shape for a key point.
 */
type KeyPointDraft = {
    id: number;
    key_point: string;
    display_order: string;
};

/**
 * Draft data shape for a technology.
 */
type TechnologyDraft = {
    id: number;
    technology_name: string;
    display_order: string;
};

/**
 * Baseline data shape (matches server response).
 */
type BaselineProject = PortfolioProject;
type BaselineKeyPoint = PortfolioKeyPoint;
type BaselineTechnology = PortfolioTechnology;

/**
 * Action type for save orchestrator.
 */
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

/**
 * Result of a save operation.
 */
export type PortfolioActionResult = {
    action: PortfolioAction;
    success: boolean;
    realId?: number;
    error?: string;
};

// State
let baselineProjects: BaselineProject[] = [];
let baselineKeyPoints: BaselineKeyPoint[] = [];
let baselineTechnologies: BaselineTechnology[] = [];
let drafts = $state<DraftItem<ProjectDraft>[]>([]);
let keyPoints = $state<Record<number, DraftItem<KeyPointDraft>[]>>({});
let technologies = $state<Record<number, DraftItem<TechnologyDraft>[]>>({});
let saving = $state(false);
let error = $state<string | null>(null);

/**
 * Initialize the draft module with server data.
 *
 * @param projects - The portfolio project data from the server
 * @param keyPointList - The key points data from the server
 * @param technologyList - The technologies data from the server
 */
export function initialize(
    projects: PortfolioProject[],
    keyPointList: PortfolioKeyPoint[],
    technologyList: PortfolioTechnology[]
): void {
    baselineProjects = [...projects];
    baselineKeyPoints = [...keyPointList];
    baselineTechnologies = [...technologyList];

    drafts = projects.sort(byDisplayOrder).map((p) => ({
        id: p.id,
        _status: 'existing',
        project_name: p.project_name,
        image_url: p.image_url ?? '',
        project_link: p.project_link ?? '',
        source_code_link: p.source_code_link ?? '',
        description: p.description ?? '',
        display_order: p.display_order == null ? '' : String(p.display_order),
        active: p.active
    }));

    // Initialize key points grouped by project ID
    const newKeyPoints: Record<number, DraftItem<KeyPointDraft>[]> = {};
    for (const project of projects) {
        const projectKeyPoints = keyPointList
            .filter((kp) => kp.portfolio_project_id === project.id)
            .sort(byDisplayOrder)
            .map(
                (kp): DraftItem<KeyPointDraft> => ({
                    id: kp.id,
                    _status: 'existing' as DraftStatus,
                    key_point: kp.key_point,
                    display_order: kp.display_order == null ? '' : String(kp.display_order)
                })
            );
        newKeyPoints[project.id] = projectKeyPoints;
    }
    keyPoints = newKeyPoints;

    // Initialize technologies grouped by project ID
    const newTechnologies: Record<number, DraftItem<TechnologyDraft>[]> = {};
    for (const project of projects) {
        const projectTechnologies = technologyList
            .filter((t) => t.portfolio_project_id === project.id)
            .sort(byDisplayOrder)
            .map(
                (t): DraftItem<TechnologyDraft> => ({
                    id: t.id,
                    _status: 'existing' as DraftStatus,
                    technology_name: t.technology_name,
                    display_order: t.display_order == null ? '' : String(t.display_order)
                })
            );
        newTechnologies[project.id] = projectTechnologies;
    }
    technologies = newTechnologies;
}

/**
 * Get all project draft items (including deleted ones).
 */
export function getDrafts(): DraftItem<ProjectDraft>[] {
    return drafts;
}

/**
 * Get visible project draft items (excluding deleted ones).
 */
export function getVisibleDrafts(): DraftItem<ProjectDraft>[] {
    return drafts.filter((d) => d._status !== 'deleted');
}

/**
 * Get key points for a specific project.
 *
 * @param projectId - The project ID (real or temp)
 */
export function getKeyPoints(projectId: number): DraftItem<KeyPointDraft>[] {
    return keyPoints[projectId] ?? [];
}

/**
 * Get visible key points for a specific project (excluding deleted ones).
 *
 * @param projectId - The project ID (real or temp)
 */
export function getVisibleKeyPoints(projectId: number): DraftItem<KeyPointDraft>[] {
    return (keyPoints[projectId] ?? []).filter((d) => d._status !== 'deleted');
}

/**
 * Get technologies for a specific project.
 *
 * @param projectId - The project ID (real or temp)
 */
export function getTechnologies(projectId: number): DraftItem<TechnologyDraft>[] {
    return technologies[projectId] ?? [];
}

/**
 * Get visible technologies for a specific project (excluding deleted ones).
 *
 * @param projectId - The project ID (real or temp)
 */
export function getVisibleTechnologies(projectId: number): DraftItem<TechnologyDraft>[] {
    return (technologies[projectId] ?? []).filter((d) => d._status !== 'deleted');
}

/**
 * Get the baseline server data for projects.
 */
export function getBaseline(): BaselineProject[] {
    return baselineProjects;
}

/**
 * Get the baseline server data for key points.
 */
export function getBaselineKeyPoints(): BaselineKeyPoint[] {
    return baselineKeyPoints;
}

/**
 * Get the baseline server data for technologies.
 */
export function getBaselineTechnologies(): BaselineTechnology[] {
    return baselineTechnologies;
}

/**
 * Add a new project draft.
 *
 * @param draft - The project data (without id and display_order)
 */
export function addProject(draft: Omit<ProjectDraft, 'id' | 'display_order'>): void {
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
    // Initialize empty key points and technologies for new project
    keyPoints = { ...keyPoints, [tempId]: [] };
    technologies = { ...technologies, [tempId]: [] };
}

/**
 * Update an existing project draft.
 *
 * @param id - The project ID (real or temp)
 * @param partial - Partial data to update
 */
export function updateProject(id: number, partial: Partial<ProjectDraft>): void {
    drafts = drafts.map((d) => (d.id === id ? { ...d, ...partial } : d));
}

/**
 * Remove a project draft (marks as deleted).
 *
 * @param id - The project ID (real or temp)
 */
export function removeProject(id: number): void {
    drafts = drafts.map((d) => (d.id === id ? { ...d, _status: 'deleted' as DraftStatus } : d));
}

/**
 * Add a new key point draft to a project.
 *
 * @param projectId - The project ID (real or temp)
 * @param draft - The key point data (without id and display_order)
 */
export function addKeyPoint(
    projectId: number,
    draft: Omit<KeyPointDraft, 'id' | 'display_order'>
): void {
    const current = keyPoints[projectId] ?? [];
    keyPoints = {
        ...keyPoints,
        [projectId]: [
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
    // Find which project this key point belongs to
    for (const projectId of Object.keys(keyPoints)) {
        const numId = Number(projectId);
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
    for (const projectId of Object.keys(keyPoints)) {
        const numId = Number(projectId);
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
 * Add a new technology draft to a project.
 *
 * @param projectId - The project ID (real or temp)
 * @param draft - The technology data (without id and display_order)
 */
export function addTechnology(
    projectId: number,
    draft: Omit<TechnologyDraft, 'id' | 'display_order'>
): void {
    const current = technologies[projectId] ?? [];
    technologies = {
        ...technologies,
        [projectId]: [
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
 * Update an existing technology draft.
 *
 * @param id - The technology ID (real or temp)
 * @param partial - Partial data to update
 */
export function updateTechnology(id: number, partial: Partial<TechnologyDraft>): void {
    // Find which project this technology belongs to
    for (const projectId of Object.keys(technologies)) {
        const numId = Number(projectId);
        const current = technologies[numId];
        if (current && current.some((t) => t.id === id)) {
            technologies = {
                ...technologies,
                [numId]: current.map((t) => (t.id === id ? { ...t, ...partial } : t))
            };
            return;
        }
    }
}

/**
 * Remove a technology draft (marks as deleted).
 *
 * @param id - The technology ID (real or temp)
 */
export function removeTechnology(id: number): void {
    for (const projectId of Object.keys(technologies)) {
        const numId = Number(projectId);
        const current = technologies[numId];
        if (current && current.some((t) => t.id === id)) {
            technologies = {
                ...technologies,
                [numId]: current.map((t) =>
                    t.id === id ? { ...t, _status: 'deleted' as DraftStatus } : t
                )
            };
            return;
        }
    }
}

/**
 * Reorder projects.
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
        display_order: String((i + 1) * 10)
    }));

    drafts = updated;
}

/**
 * Reorder key points within a project.
 *
 * @param projectId - The project ID
 * @param fromId - The ID of the key point to move
 * @param toId - The ID of the target position
 */
export function reorderKeyPoints(projectId: number, fromId: number, toId: number): void {
    const current = keyPoints[projectId];
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
        display_order: String((i + 1) * 10)
    }));

    keyPoints = { ...keyPoints, [projectId]: updated };
}

/**
 * Reorder technologies within a project.
 *
 * @param projectId - The project ID
 * @param fromId - The ID of the technology to move
 * @param toId - The ID of the target position
 */
export function reorderTechnologies(projectId: number, fromId: number, toId: number): void {
    const current = technologies[projectId];
    if (!current) return;

    const fromIndex = current.findIndex((t) => t.id === fromId);
    const toIndex = current.findIndex((t) => t.id === toId);

    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

    const newTechnologies = [...current];
    const [removed] = newTechnologies.splice(fromIndex, 1);
    newTechnologies.splice(toIndex, 0, removed);

    // Update display_order based on new positions
    const updated = newTechnologies.map((t, i) => ({
        ...t,
        display_order: String((i + 1) * 10)
    }));

    technologies = { ...technologies, [projectId]: updated };
}

/**
 * Validate a project draft.
 *
 * @param id - The project ID (real or temp)
 */
export function validateProject(id: number): void {
    const draft = drafts.find((d) => d.id === id);
    if (!draft) return;

    const errors: string[] = [];

    if (!draft.project_name.trim()) {
        errors.push('Project name is required');
    }

    if (errors.length > 0) {
        drafts = drafts.map((d) => (d.id === id ? setValidationError(d, errors.join(', ')) : d));
    } else {
        drafts = drafts.map((d) => (d.id === id ? setValidationError(d, null) : d));
    }
}

/**
 * Validate a key point draft.
 *
 * @param id - The key point ID (real or temp)
 */
export function validateKeyPoint(id: number): void {
    for (const projectId of Object.keys(keyPoints)) {
        const numId = Number(projectId);
        const current = keyPoints[numId];
        if (current && current.some((kp) => kp.id === id)) {
            const draft = current.find((kp) => kp.id === id);
            if (!draft) return;

            const errors: string[] = [];

            if (!draft.key_point.trim()) {
                errors.push('Key point is required');
            }

            if (errors.length > 0) {
                keyPoints = {
                    ...keyPoints,
                    [numId]: current.map((kp) =>
                        kp.id === id ? setValidationError(kp, errors.join(', ')) : kp
                    )
                };
            } else {
                keyPoints = {
                    ...keyPoints,
                    [numId]: current.map((kp) => (kp.id === id ? setValidationError(kp, null) : kp))
                };
            }
            return;
        }
    }
}

/**
 * Validate a technology draft.
 *
 * @param id - The technology ID (real or temp)
 */
export function validateTechnology(id: number): void {
    for (const projectId of Object.keys(technologies)) {
        const numId = Number(projectId);
        const current = technologies[numId];
        if (current && current.some((t) => t.id === id)) {
            const draft = current.find((t) => t.id === id);
            if (!draft) return;

            const errors: string[] = [];

            if (!draft.technology_name.trim()) {
                errors.push('Technology name is required');
            }

            if (errors.length > 0) {
                technologies = {
                    ...technologies,
                    [numId]: current.map((t) =>
                        t.id === id ? setValidationError(t, errors.join(', ')) : t
                    )
                };
            } else {
                technologies = {
                    ...technologies,
                    [numId]: current.map((t) => (t.id === id ? setValidationError(t, null) : t))
                };
            }
            return;
        }
    }
}

/**
 * Validate all visible portfolio projects, key points, and technologies.
 *
 * @returns true if all visible items are valid, false otherwise
 */
export function validateAll(): boolean {
    for (const draft of getVisibleDrafts()) {
        validateProject(draft.id);
    }
    for (const projectId of Object.keys(keyPoints)) {
        for (const keyPoint of getVisibleKeyPoints(Number(projectId))) {
            validateKeyPoint(keyPoint.id);
        }
    }
    for (const projectId of Object.keys(technologies)) {
        for (const technology of getVisibleTechnologies(Number(projectId))) {
            validateTechnology(technology.id);
        }
    }
    return getValidationErrors().length === 0;
}

/**
 * Check if the portfolio section has unsaved changes.
 */
export function isDirty(): boolean {
    // Check for new or deleted projects
    if (drafts.some((d) => d._status === 'new')) return true;
    if (drafts.some((d) => d._status === 'deleted')) return true;

    // Check for new or deleted key points
    const flatKeyPoints = Object.values(keyPoints).flat();
    if (flatKeyPoints.some((kp) => kp._status === 'new')) return true;
    if (flatKeyPoints.some((kp) => kp._status === 'deleted')) return true;

    // Check for new or deleted technologies
    const flatTechnologies = Object.values(technologies).flat();
    if (flatTechnologies.some((t) => t._status === 'new')) return true;
    if (flatTechnologies.some((t) => t._status === 'deleted')) return true;

    // Check projects - normalize data before comparison
    const baselineProjectSig = computeSignature(
        baselineProjects.sort(byDisplayOrder).map((p) => ({
            id: p.id,
            project_name: p.project_name,
            image_url: p.image_url ?? '',
            project_link: p.project_link ?? '',
            source_code_link: p.source_code_link ?? '',
            description: p.description ?? '',
            display_order: p.display_order,
            active: p.active
        }))
    );
    const draftProjectSig = computeSignature(
        drafts
            .filter((d) => d._status === 'existing')
            .map((d) => ({
                id: d.id,
                project_name: d.project_name,
                image_url: d.image_url,
                project_link: d.project_link,
                source_code_link: d.source_code_link,
                description: d.description,
                display_order: toNumberOrNull(d.display_order),
                active: d.active
            }))
            .sort(byDisplayOrder)
    );
    if (baselineProjectSig !== draftProjectSig) {
        return true;
    }

    // Check key points - normalize data before comparison
    const baselineKeyPointSig = computeSignature(
        baselineKeyPoints.sort(byDisplayOrder).map((kp) => ({
            id: kp.id,
            key_point: kp.key_point,
            display_order: kp.display_order
        }))
    );
    const draftKeyPointSig = computeSignature(
        flatKeyPoints
            .filter((kp) => kp._status === 'existing')
            .map((kp) => ({
                id: kp.id,
                key_point: kp.key_point,
                display_order: toNumberOrNull(kp.display_order)
            }))
            .sort(byDisplayOrder)
    );
    if (baselineKeyPointSig !== draftKeyPointSig) {
        return true;
    }

    // Check technologies - normalize data before comparison
    const baselineTechnologySig = computeSignature(
        baselineTechnologies.sort(byDisplayOrder).map((t) => ({
            id: t.id,
            technology_name: t.technology_name,
            display_order: t.display_order
        }))
    );
    const draftTechnologySig = computeSignature(
        flatTechnologies
            .filter((t) => t._status === 'existing')
            .map((t) => ({
                id: t.id,
                technology_name: t.technology_name,
                display_order: toNumberOrNull(t.display_order)
            }))
            .sort(byDisplayOrder)
    );
    if (baselineTechnologySig !== draftTechnologySig) {
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
            errors.push(`Project: ${draft._validationError}`);
        }
    }

    for (const projectKeyPoints of Object.values(keyPoints)) {
        for (const kp of projectKeyPoints) {
            if (kp._validationError) {
                errors.push(`Key point: ${kp._validationError}`);
            }
        }
    }

    for (const projectTechnologies of Object.values(technologies)) {
        for (const t of projectTechnologies) {
            if (t._validationError) {
                errors.push(`Technology: ${t._validationError}`);
            }
        }
    }

    return errors;
}

/**
 * Reset all drafts to the baseline.
 */
export function resetToBaseline(): void {
    drafts = baselineProjects.sort(byDisplayOrder).map((p) => ({
        id: p.id,
        _status: 'existing',
        project_name: p.project_name,
        image_url: p.image_url ?? '',
        project_link: p.project_link ?? '',
        source_code_link: p.source_code_link ?? '',
        description: p.description ?? '',
        display_order: p.display_order == null ? '' : String(p.display_order),
        active: p.active
    }));

    const newKeyPoints: Record<number, DraftItem<KeyPointDraft>[]> = {};
    for (const project of baselineProjects) {
        const projectKeyPoints = baselineKeyPoints
            .filter((kp) => kp.portfolio_project_id === project.id)
            .sort(byDisplayOrder)
            .map(
                (kp): DraftItem<KeyPointDraft> => ({
                    id: kp.id,
                    _status: 'existing' as DraftStatus,
                    key_point: kp.key_point,
                    display_order: kp.display_order == null ? '' : String(kp.display_order)
                })
            );
        newKeyPoints[project.id] = projectKeyPoints;
    }
    keyPoints = newKeyPoints;

    const newTechnologies: Record<number, DraftItem<TechnologyDraft>[]> = {};
    for (const project of baselineProjects) {
        const projectTechnologies = baselineTechnologies
            .filter((t) => t.portfolio_project_id === project.id)
            .sort(byDisplayOrder)
            .map(
                (t): DraftItem<TechnologyDraft> => ({
                    id: t.id,
                    _status: 'existing' as DraftStatus,
                    technology_name: t.technology_name,
                    display_order: t.display_order == null ? '' : String(t.display_order)
                })
            );
        newTechnologies[project.id] = projectTechnologies;
    }
    technologies = newTechnologies;
}

/**
 * Compute the diff between drafts and baseline for the save orchestrator.
 */
export function computeDiff(): PortfolioAction[] {
    const actions: PortfolioAction[] = [];

    // Process projects
    for (const draft of drafts) {
        if (draft._status === 'new') {
            actions.push({
                type: 'createProject',
                tempId: draft.id,
                payload: {
                    project_name: draft.project_name,
                    image_url: toNullable(draft.image_url),
                    project_link: toNullable(draft.project_link),
                    source_code_link: toNullable(draft.source_code_link),
                    description: toNullable(draft.description),
                    display_order: toNumberOrNull(draft.display_order),
                    active: draft.active
                }
            });
        } else if (draft._status === 'deleted') {
            // Skip delete actions for items that were never saved (new-then-deleted)
            if (draft.id < 0) continue;
            actions.push({ type: 'deleteProject', id: draft.id });
        } else if (draft._status === 'existing') {
            const baseline = baselineProjects.find((p) => p.id === draft.id);
            if (baseline) {
                const payload: UpdatePortfolioProjectRequest = {};
                if (baseline.project_name !== draft.project_name) {
                    payload.project_name = draft.project_name;
                }
                if (baseline.image_url !== draft.image_url) {
                    payload.image_url = toNullable(draft.image_url);
                }
                if (baseline.project_link !== draft.project_link) {
                    payload.project_link = toNullable(draft.project_link);
                }
                if (baseline.source_code_link !== draft.source_code_link) {
                    payload.source_code_link = toNullable(draft.source_code_link);
                }
                if (baseline.description !== draft.description) {
                    payload.description = toNullable(draft.description);
                }
                if (String(baseline.display_order ?? '') !== draft.display_order) {
                    payload.display_order = toNumberOrNull(draft.display_order);
                }
                if (baseline.active !== draft.active) {
                    payload.active = draft.active;
                }

                if (Object.keys(payload).length > 0) {
                    actions.push({ type: 'updateProject', id: draft.id, payload });
                }
            }
        }
    }

    // Process key points
    for (const [projectId, projectKeyPoints] of Object.entries(keyPoints)) {
        const numProjectId = Number(projectId);
        const baselineKeyPointsForProject = baselineKeyPoints.filter(
            (kp) => kp.portfolio_project_id === numProjectId
        );

        for (const kp of projectKeyPoints) {
            if (kp._status === 'new') {
                actions.push({
                    type: 'createKeyPoint',
                    projectId: numProjectId,
                    tempId: kp.id,
                    payload: {
                        key_point: kp.key_point,
                        display_order: toNumberOrNull(kp.display_order)
                    }
                });
            } else if (kp._status === 'deleted') {
                // Skip delete actions for items that were never saved (new-then-deleted)
                if (kp.id < 0) continue;
                actions.push({ type: 'deleteKeyPoint', id: kp.id });
            } else if (kp._status === 'existing') {
                const baseline = baselineKeyPointsForProject.find((b) => b.id === kp.id);
                if (baseline) {
                    const payload: UpdatePortfolioKeyPointRequest = {};
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

    // Process technologies
    for (const [projectId, projectTechnologies] of Object.entries(technologies)) {
        const numProjectId = Number(projectId);
        const baselineTechnologiesForProject = baselineTechnologies.filter(
            (t) => t.portfolio_project_id === numProjectId
        );

        for (const t of projectTechnologies) {
            if (t._status === 'new') {
                actions.push({
                    type: 'createTechnology',
                    projectId: numProjectId,
                    tempId: t.id,
                    payload: {
                        technology_name: t.technology_name,
                        display_order: toNumberOrNull(t.display_order)
                    }
                });
            } else if (t._status === 'deleted') {
                // Skip delete actions for items that were never saved (new-then-deleted)
                if (t.id < 0) continue;
                actions.push({ type: 'deleteTechnology', id: t.id });
            } else if (t._status === 'existing') {
                const baseline = baselineTechnologiesForProject.find((b) => b.id === t.id);
                if (baseline) {
                    const payload: UpdatePortfolioTechnologyRequest = {};
                    if (baseline.technology_name !== t.technology_name) {
                        payload.technology_name = t.technology_name;
                    }
                    if (String(baseline.display_order ?? '') !== t.display_order) {
                        payload.display_order = toNumberOrNull(t.display_order);
                    }

                    if (Object.keys(payload).length > 0) {
                        actions.push({ type: 'updateTechnology', id: t.id, payload });
                    }
                }
            }
        }
    }

    return actions;
}

/**
 * Apply save results from the server.
 *
 * Maps temp IDs for newly created items to real IDs and removes deleted items.
 * Baseline is not updated here; call `commitBaseline()` after all save phases
 * succeed so failed items remain dirty for retry.
 *
 * @param tempIdMap - Map of temp IDs to real server IDs
 */
export function applySaveResults(tempIdMap: Map<number, number>): void {
    // Update project IDs - only mark successful creations as existing
    drafts = drafts
        .map((d) => {
            if (d._status === 'new' && tempIdMap.has(d.id)) {
                return { ...d, id: tempIdMap.get(d.id)!, _status: 'existing' as DraftStatus };
            }
            if (d._status === 'deleted') {
                return null;
            }
            return d;
        })
        .filter((d): d is DraftItem<ProjectDraft> => d !== null);

    // Update key point IDs - only mark successful creations as existing
    const newKeyPoints: Record<number, DraftItem<KeyPointDraft>[]> = {};
    for (const projectId of Object.keys(keyPoints)) {
        const numProjectId = Number(projectId);
        // Check if project ID was remapped
        const realProjectId = tempIdMap.get(numProjectId) ?? numProjectId;
        newKeyPoints[realProjectId] = keyPoints[numProjectId]
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

    // Update technology IDs - only mark successful creations as existing
    const newTechnologies: Record<number, DraftItem<TechnologyDraft>[]> = {};
    for (const projectId of Object.keys(technologies)) {
        const numProjectId = Number(projectId);
        // Check if project ID was remapped
        const realProjectId = tempIdMap.get(numProjectId) ?? numProjectId;
        newTechnologies[realProjectId] = technologies[numProjectId]
            .map((t) => {
                if (t._status === 'new' && tempIdMap.has(t.id)) {
                    return { ...t, id: tempIdMap.get(t.id)!, _status: 'existing' as DraftStatus };
                }
                if (t._status === 'deleted') {
                    return null;
                }
                return t;
            })
            .filter((t): t is DraftItem<TechnologyDraft> => t !== null);
    }
    technologies = newTechnologies;
}

/**
 * Commit the current draft state to the baseline after a successful save.
 */
export function commitBaseline(): void {
    const resumeId = baselineProjects[0]?.resume_id ?? 0;

    baselineProjects = drafts
        .filter((d) => d._status === 'existing')
        .map((d) => {
            const existing = baselineProjects.find((bp) => bp.id === d.id);
            return {
                id: d.id,
                resume_id: existing?.resume_id ?? resumeId,
                project_name: d.project_name.trim(),
                image_url: toNullable(d.image_url),
                project_link: toNullable(d.project_link),
                source_code_link: toNullable(d.source_code_link),
                description: toNullable(d.description),
                display_order: toNumberOrNull(d.display_order),
                active: d.active,
                created_at: existing?.created_at ?? ''
            };
        });

    baselineKeyPoints = [];
    for (const projectId of Object.keys(keyPoints)) {
        const numProjectId = Number(projectId);
        const current = keyPoints[numProjectId];
        if (current) {
            for (const kp of current.filter((k) => k._status === 'existing')) {
                const existing = baselineKeyPoints.find((bkp) => bkp.id === kp.id);
                baselineKeyPoints.push({
                    id: kp.id,
                    portfolio_project_id: numProjectId,
                    key_point: kp.key_point.trim(),
                    display_order: toNumberOrNull(kp.display_order),
                    created_at: existing?.created_at ?? ''
                });
            }
        }
    }

    baselineTechnologies = [];
    for (const projectId of Object.keys(technologies)) {
        const numProjectId = Number(projectId);
        const current = technologies[numProjectId];
        if (current) {
            for (const tech of current.filter((t) => t._status === 'existing')) {
                const existing = baselineTechnologies.find((bt) => bt.id === tech.id);
                baselineTechnologies.push({
                    id: tech.id,
                    portfolio_project_id: numProjectId,
                    technology_name: tech.technology_name.trim(),
                    display_order: toNumberOrNull(tech.display_order),
                    created_at: existing?.created_at ?? ''
                });
            }
        }
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
