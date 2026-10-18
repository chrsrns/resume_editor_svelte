import { updateResume } from '$lib/api/resumes';
import { createSkill, updateSkill, deleteSkill } from '$lib/api/skills';
import {
    createEducation,
    updateEducation,
    deleteEducation,
    createEducationKeyPoint,
    updateEducationKeyPoint,
    deleteEducationKeyPoint
} from '$lib/api/education';
import {
    createWorkExperience,
    updateWorkExperience,
    deleteWorkExperience,
    createWorkExperienceKeyPoint,
    updateWorkExperienceKeyPoint,
    deleteWorkExperienceKeyPoint
} from '$lib/api/work-experience';
import {
    createPortfolioProject,
    updatePortfolioProject,
    deletePortfolioProject,
    createPortfolioKeyPoint,
    updatePortfolioKeyPoint,
    deletePortfolioKeyPoint,
    createPortfolioTechnology,
    updatePortfolioTechnology,
    deletePortfolioTechnology
} from '$lib/api/portfolio';
import { createLanguage, updateLanguage, deleteLanguage } from '$lib/api/languages';
import { createFramework, updateFramework, deleteFramework } from '$lib/api/frameworks';
import type { ApiError } from '$lib/api/client';
import type {
    NewSkillRequest,
    UpdateSkillRequest,
    NewEducationRequest,
    UpdateEducationRequest,
    NewEducationKeyPointRequest,
    UpdateEducationKeyPointRequest,
    NewWorkExperienceRequest,
    UpdateWorkExperienceRequest,
    NewWorkExperienceKeyPointRequest,
    UpdateWorkExperienceKeyPointRequest,
    NewPortfolioProjectRequest,
    UpdatePortfolioProjectRequest,
    NewPortfolioKeyPointRequest,
    UpdatePortfolioKeyPointRequest,
    NewPortfolioTechnologyRequest,
    UpdatePortfolioTechnologyRequest,
    NewLanguageRequest,
    UpdateLanguageRequest,
    NewFrameworkRequest,
    UpdateFrameworkRequest
} from '$lib/types';
import type { DraftAction } from './draftStore';
import { basics, skills, education, work, portfolio, languages } from './index';

export type SaveResult = {
    success: boolean;
    message: string;
    errors: Array<{ section: string; error: string }>;
};

type SectionError = { section: string; error: string };

function errorFromReason(reason: unknown, section: string): SectionError {
    const err = reason as ApiError;
    return { section, error: err.message || 'Failed to save item' };
}

function collectDeletes(
    section: string,
    results: PromiseSettledResult<unknown>[],
    actions: DraftAction[],
    errors: SectionError[],
    succeeded: Set<number>
): void {
    results.forEach((result, i) => {
        const id = actions[i].id!;
        if (result.status === 'fulfilled' || (result.reason as ApiError)?.status === 404) {
            succeeded.add(id);
        } else {
            errors.push(errorFromReason(result.reason, section));
        }
    });
}

type SaveStore = {
    applySaveResults(tempIdMap: Map<number, number>, succeededDeleteIds?: Set<number>): void;
    commitBaseline(): void;
};

function flushDeletes(store: SaveStore, succeeded: Set<number>): void {
    store.applySaveResults(new Map(), succeeded);
    store.commitBaseline();
}

export type ChildGroupPlan = {
    label: string;
    actionTypes: { create: string; update: string; delete: string };
    /** DraftAction field carrying the (possibly temp) parent id. */
    parentIdField: string;
    call: {
        create: (resumeId: string, parentId: number, payload: unknown) => Promise<{ id: number }>;
        update: (id: number, payload: unknown) => Promise<unknown>;
        delete: (id: number) => Promise<unknown>;
    };
};

export type EntitySectionPlan = {
    kind: 'entity';
    label: string;
    store: SaveStore & { computeDiff(): DraftAction[] };
    actionTypes: { create: string; update: string; delete: string };
    call: {
        create: (resumeId: string, payload: unknown) => Promise<{ id: number }>;
        update: (id: number, payload: unknown) => Promise<unknown>;
        delete: (id: number) => Promise<unknown>;
    };
    childGroups?: ChildGroupPlan[];
};

export type CustomSectionPlan = {
    kind: 'custom';
    label: string;
    run: (resumeId: string) => Promise<SectionError[]>;
};

export type SectionPlan = EntitySectionPlan | CustomSectionPlan;

/**
 * Generic save pipeline: parent creates → child creates (temp-id resolved)
 * → merged updates → child deletes → parent deletes. Deletes drop only on
 * success or 404; child creates under a failed parent are skipped.
 */
export async function processSection(
    resumeId: string,
    plan: SectionPlan
): Promise<{ errors: SectionError[] }> {
    if (plan.kind === 'custom') {
        return { errors: await plan.run(resumeId) };
    }

    const errors: SectionError[] = [];
    const succeededDeletes = new Set<number>();
    const store = plan.store;
    const actions = store.computeDiff();
    const groups = plan.childGroups ?? [];

    const parentCreates = actions.filter((a) => a.type === plan.actionTypes.create);
    const parentUpdates = actions.filter((a) => a.type === plan.actionTypes.update);
    const parentDeletes = actions.filter((a) => a.type === plan.actionTypes.delete);

    const tempIdMap = new Map<number, number>();
    const createResults = await Promise.allSettled(
        parentCreates.map(async (action) => {
            const result = await plan.call.create(resumeId, action.payload);
            return { tempId: action.tempId!, realId: result.id };
        })
    );
    for (const result of createResults) {
        if (result.status === 'fulfilled') {
            tempIdMap.set(result.value.tempId, result.value.realId);
        } else {
            errors.push(errorFromReason(result.reason, plan.label));
        }
    }
    store.applySaveResults(tempIdMap);
    store.commitBaseline();

    if (groups.length > 0) {
        const childCreateOps = groups.flatMap((g) =>
            actions
                .filter((a) => a.type === g.actionTypes.create)
                .filter((a) => {
                    const parentId = a[g.parentIdField] as number;
                    return parentId >= 0 || tempIdMap.has(parentId);
                })
                .map((action) => async () => {
                    const parentId = action[g.parentIdField] as number;
                    const realParent = tempIdMap.get(parentId) ?? parentId;
                    const result = await g.call.create(resumeId, realParent, action.payload);
                    return { tempId: action.tempId!, realId: result.id };
                })
        );
        const childCreateResults = await Promise.allSettled(childCreateOps.map((op) => op()));
        for (const result of childCreateResults) {
            if (result.status === 'fulfilled') {
                tempIdMap.set(result.value.tempId, result.value.realId);
            } else {
                errors.push(errorFromReason(result.reason, plan.label));
            }
        }
        store.applySaveResults(tempIdMap);
        store.commitBaseline();
    }

    const updateOps = [
        ...parentUpdates.map((a) => () => plan.call.update(a.id!, a.payload)),
        ...groups.flatMap((g) =>
            actions
                .filter((a) => a.type === g.actionTypes.update)
                .map((a) => () => g.call.update(a.id!, a.payload))
        )
    ];
    const updateResults = await Promise.allSettled(updateOps.map((op) => op()));
    for (const result of updateResults) {
        if (result.status === 'rejected') {
            errors.push(errorFromReason(result.reason, plan.label));
        }
    }
    store.commitBaseline();

    const childDeleteEntries = groups.flatMap((g) =>
        actions
            .filter((a) => a.type === g.actionTypes.delete)
            .map((action) => ({
                action,
                section: g.label,
                run: () => g.call.delete(action.id!)
            }))
    );
    const childDeleteResults = await Promise.allSettled(childDeleteEntries.map((e) => e.run()));
    childDeleteResults.forEach((result, i) => {
        const id = childDeleteEntries[i].action.id!;
        if (result.status === 'fulfilled' || (result.reason as ApiError)?.status === 404) {
            succeededDeletes.add(id);
        } else {
            errors.push(errorFromReason(result.reason, childDeleteEntries[i].section));
        }
    });
    store.commitBaseline();

    const parentDeleteResults = await Promise.allSettled(
        parentDeletes.map((a) => plan.call.delete(a.id!))
    );
    collectDeletes(plan.label, parentDeleteResults, parentDeletes, errors, succeededDeletes);
    flushDeletes(store, succeededDeletes);

    return { errors };
}

export async function saveAll(resumeId: string): Promise<SaveResult> {
    const errors: SectionError[] = [];

    try {
        for (const plan of [
            basicsPlan,
            skillsPlan,
            educationPlan,
            workPlan,
            portfolioPlan,
            languagesPlan
        ]) {
            errors.push(...(await processSection(resumeId, plan)).errors);
        }

        if (errors.length === 0) {
            return { success: true, message: 'All changes saved successfully!', errors: [] };
        }

        return {
            success: false,
            message: `Failed to save ${errors.length} item(s). Please fix the errors and try again.`,
            errors
        };
    } catch (e) {
        const err = e as ApiError;
        return {
            success: false,
            message: err.message || 'An unexpected error occurred',
            errors: [{ section: 'System', error: err.message || 'Unknown error' }]
        };
    }
}

const basicsPlan: SectionPlan = {
    kind: 'custom',
    label: 'Basics',
    run: async (resumeId) => {
        if (!basics.isDirty()) return [];
        try {
            await updateResume(resumeId, basics.toUpdatePayload());
            basics.commitBaseline();
            return [];
        } catch (e) {
            return [errorFromReason(e, 'Basics')];
        }
    }
};

const skillsPlan: SectionPlan = {
    kind: 'entity',
    label: 'Skills',
    store: skills,
    actionTypes: { create: 'create', update: 'update', delete: 'delete' },
    call: {
        create: (resumeId, payload) => createSkill(resumeId, payload as NewSkillRequest),
        update: (id, payload) => updateSkill(id, payload as UpdateSkillRequest),
        delete: (id) => deleteSkill(id)
    }
};

const educationPlan: SectionPlan = {
    kind: 'entity',
    label: 'Education',
    store: education,
    actionTypes: {
        create: 'createEducation',
        update: 'updateEducation',
        delete: 'deleteEducation'
    },
    call: {
        create: (resumeId, payload) => createEducation(resumeId, payload as NewEducationRequest),
        update: (id, payload) => updateEducation(id, payload as UpdateEducationRequest),
        delete: (id) => deleteEducation(id)
    },
    childGroups: [
        {
            label: 'Education key points',
            actionTypes: {
                create: 'createKeyPoint',
                update: 'updateKeyPoint',
                delete: 'deleteKeyPoint'
            },
            parentIdField: 'educationId',
            call: {
                create: (resumeId, parentId, payload) =>
                    createEducationKeyPoint(
                        resumeId,
                        parentId,
                        payload as NewEducationKeyPointRequest
                    ),
                update: (id, payload) =>
                    updateEducationKeyPoint(id, payload as UpdateEducationKeyPointRequest),
                delete: (id) => deleteEducationKeyPoint(id)
            }
        }
    ]
};

const workPlan: SectionPlan = {
    kind: 'entity',
    label: 'Work',
    store: work,
    actionTypes: { create: 'createWork', update: 'updateWork', delete: 'deleteWork' },
    call: {
        create: (resumeId, payload) =>
            createWorkExperience(resumeId, payload as NewWorkExperienceRequest),
        update: (id, payload) => updateWorkExperience(id, payload as UpdateWorkExperienceRequest),
        delete: (id) => deleteWorkExperience(id)
    },
    childGroups: [
        {
            label: 'Work key points',
            actionTypes: {
                create: 'createKeyPoint',
                update: 'updateKeyPoint',
                delete: 'deleteKeyPoint'
            },
            parentIdField: 'workId',
            call: {
                create: (resumeId, parentId, payload) =>
                    createWorkExperienceKeyPoint(
                        resumeId,
                        parentId,
                        payload as NewWorkExperienceKeyPointRequest
                    ),
                update: (id, payload) =>
                    updateWorkExperienceKeyPoint(
                        id,
                        payload as UpdateWorkExperienceKeyPointRequest
                    ),
                delete: (id) => deleteWorkExperienceKeyPoint(id)
            }
        }
    ]
};

const portfolioPlan: SectionPlan = {
    kind: 'entity',
    label: 'Portfolio',
    store: portfolio,
    actionTypes: {
        create: 'createProject',
        update: 'updateProject',
        delete: 'deleteProject'
    },
    call: {
        create: (resumeId, payload) =>
            createPortfolioProject(resumeId, payload as NewPortfolioProjectRequest),
        update: (id, payload) =>
            updatePortfolioProject(id, payload as UpdatePortfolioProjectRequest),
        delete: (id) => deletePortfolioProject(id)
    },
    childGroups: [
        {
            label: 'Portfolio',
            actionTypes: {
                create: 'createKeyPoint',
                update: 'updateKeyPoint',
                delete: 'deleteKeyPoint'
            },
            parentIdField: 'projectId',
            call: {
                create: (resumeId, parentId, payload) =>
                    createPortfolioKeyPoint(
                        resumeId,
                        parentId,
                        payload as NewPortfolioKeyPointRequest
                    ),
                update: (id, payload) =>
                    updatePortfolioKeyPoint(id, payload as UpdatePortfolioKeyPointRequest),
                delete: (id) => deletePortfolioKeyPoint(id)
            }
        },
        {
            label: 'Portfolio',
            actionTypes: {
                create: 'createTechnology',
                update: 'updateTechnology',
                delete: 'deleteTechnology'
            },
            parentIdField: 'projectId',
            call: {
                create: (resumeId, parentId, payload) =>
                    createPortfolioTechnology(
                        resumeId,
                        parentId,
                        payload as NewPortfolioTechnologyRequest
                    ),
                update: (id, payload) =>
                    updatePortfolioTechnology(id, payload as UpdatePortfolioTechnologyRequest),
                delete: (id) => deletePortfolioTechnology(id)
            }
        }
    ]
};

const languagesPlan: SectionPlan = {
    kind: 'entity',
    label: 'Languages',
    store: languages,
    actionTypes: {
        create: 'createLanguage',
        update: 'updateLanguage',
        delete: 'deleteLanguage'
    },
    call: {
        create: (resumeId, payload) => createLanguage(resumeId, payload as NewLanguageRequest),
        update: (id, payload) => updateLanguage(id, payload as UpdateLanguageRequest),
        delete: (id) => deleteLanguage(id)
    },
    childGroups: [
        {
            label: 'Language frameworks',
            actionTypes: {
                create: 'createFramework',
                update: 'updateFramework',
                delete: 'deleteFramework'
            },
            parentIdField: 'languageId',
            call: {
                create: (resumeId, parentId, payload) =>
                    createFramework(resumeId, parentId, payload as NewFrameworkRequest),
                update: (id, payload) => updateFramework(id, payload as UpdateFrameworkRequest),
                delete: (id) => deleteFramework(id)
            }
        }
    ]
};
