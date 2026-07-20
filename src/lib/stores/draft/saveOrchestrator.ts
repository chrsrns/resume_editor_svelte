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

export async function saveAll(resumeId: number): Promise<SaveResult> {
    const errors: SectionError[] = [];

    try {
        if (basics.isDirty()) {
            try {
                await updateResume(resumeId, basics.toUpdatePayload());
                basics.commitBaseline();
            } catch (e) {
                errors.push(errorFromReason(e, 'Basics'));
            }
        }

        errors.push(...(await processSkillsSection(resumeId)).errors);
        errors.push(...(await processEducationSection(resumeId)).errors);
        errors.push(...(await processWorkSection(resumeId)).errors);
        errors.push(...(await processPortfolioSection(resumeId)).errors);
        errors.push(...(await processLanguagesSection(resumeId)).errors);

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

async function processSkillsSection(resumeId: number): Promise<{ errors: SectionError[] }> {
    const errors: SectionError[] = [];
    const actions = skills.computeDiff();
    const creates = actions.filter((a) => a.type === 'create');
    const updates = actions.filter((a) => a.type === 'update');
    const deletes = actions.filter((a) => a.type === 'delete');

    const createResults = await Promise.allSettled(
        creates.map(async (action) => {
            const result = await createSkill(resumeId, action.payload);
            return { tempId: action.tempId, realId: result.id };
        })
    );
    const tempIdMap = new Map<number, number>();
    for (const result of createResults) {
        if (result.status === 'fulfilled') {
            tempIdMap.set(result.value.tempId, result.value.realId);
        } else {
            errors.push(errorFromReason(result.reason, 'Skills'));
        }
    }
    skills.applySaveResults(tempIdMap);
    skills.commitBaseline();

    const updateDeleteResults = await Promise.allSettled([
        ...updates.map((action) => updateSkill(action.id, action.payload)),
        ...deletes.map((action) => deleteSkill(action.id))
    ]);
    for (const result of updateDeleteResults) {
        if (result.status === 'rejected') errors.push(errorFromReason(result.reason, 'Skills'));
    }
    skills.commitBaseline();

    return { errors };
}

async function processEducationSection(resumeId: number): Promise<{ errors: SectionError[] }> {
    const errors: SectionError[] = [];
    const actions = education.computeDiff();
    const educationCreates = actions.filter((a) => a.type === 'createEducation');
    const keyPointCreates = actions.filter((a) => a.type === 'createKeyPoint');
    const educationUpdates = actions.filter((a) => a.type === 'updateEducation');
    const keyPointUpdates = actions.filter((a) => a.type === 'updateKeyPoint');
    const educationDeletes = actions.filter((a) => a.type === 'deleteEducation');
    const keyPointDeletes = actions.filter((a) => a.type === 'deleteKeyPoint');

    const educationCreateResults = await Promise.allSettled(
        educationCreates.map(async (action) => {
            const result = await createEducation(resumeId, action.payload);
            return { tempId: action.tempId, realId: result.id };
        })
    );
    const educationTempIdMap = new Map<number, number>();
    for (const result of educationCreateResults) {
        if (result.status === 'fulfilled') {
            educationTempIdMap.set(result.value.tempId, result.value.realId);
        } else {
            errors.push(errorFromReason(result.reason, 'Education'));
        }
    }
    education.applySaveResults(educationTempIdMap);
    education.commitBaseline();

    const keyPointCreateResults = await Promise.allSettled(
        keyPointCreates.map(async (action) => {
            const educationId = educationTempIdMap.get(action.educationId) ?? action.educationId;
            const result = await createEducationKeyPoint(resumeId, educationId, action.payload);
            return { tempId: action.tempId, realId: result.id };
        })
    );
    const keyPointTempIdMap = new Map<number, number>();
    for (const result of keyPointCreateResults) {
        if (result.status === 'fulfilled') {
            keyPointTempIdMap.set(result.value.tempId, result.value.realId);
        } else {
            errors.push(errorFromReason(result.reason, 'Education key points'));
        }
    }
    education.applySaveResults(new Map([...educationTempIdMap, ...keyPointTempIdMap]));
    education.commitBaseline();

    const updateResults = await Promise.allSettled([
        ...educationUpdates.map((action) => updateEducation(action.id, action.payload)),
        ...keyPointUpdates.map((action) => updateEducationKeyPoint(action.id, action.payload))
    ]);
    for (const result of updateResults) {
        if (result.status === 'rejected') errors.push(errorFromReason(result.reason, 'Education'));
    }
    education.commitBaseline();

    const childDeleteResults = await Promise.allSettled(
        keyPointDeletes.map((action) => deleteEducationKeyPoint(action.id))
    );
    for (const result of childDeleteResults) {
        if (result.status === 'rejected')
            errors.push(errorFromReason(result.reason, 'Education key points'));
    }
    education.commitBaseline();

    const parentDeleteResults = await Promise.allSettled(
        educationDeletes.map((action) => deleteEducation(action.id))
    );
    for (const result of parentDeleteResults) {
        if (result.status === 'rejected') errors.push(errorFromReason(result.reason, 'Education'));
    }
    education.commitBaseline();

    return { errors };
}

async function processWorkSection(resumeId: number): Promise<{ errors: SectionError[] }> {
    const errors: SectionError[] = [];
    const actions = work.computeDiff();
    const workCreates = actions.filter((a) => a.type === 'createWork');
    const keyPointCreates = actions.filter((a) => a.type === 'createKeyPoint');
    const workUpdates = actions.filter((a) => a.type === 'updateWork');
    const keyPointUpdates = actions.filter((a) => a.type === 'updateKeyPoint');
    const workDeletes = actions.filter((a) => a.type === 'deleteWork');
    const keyPointDeletes = actions.filter((a) => a.type === 'deleteKeyPoint');

    const workCreateResults = await Promise.allSettled(
        workCreates.map(async (action) => {
            const result = await createWorkExperience(resumeId, action.payload);
            return { tempId: action.tempId, realId: result.id };
        })
    );
    const workTempIdMap = new Map<number, number>();
    for (const result of workCreateResults) {
        if (result.status === 'fulfilled') {
            workTempIdMap.set(result.value.tempId, result.value.realId);
        } else {
            errors.push(errorFromReason(result.reason, 'Work'));
        }
    }
    work.applySaveResults(workTempIdMap);
    work.commitBaseline();

    const keyPointCreateResults = await Promise.allSettled(
        keyPointCreates.map(async (action) => {
            const workId = workTempIdMap.get(action.workId) ?? action.workId;
            const result = await createWorkExperienceKeyPoint(resumeId, workId, action.payload);
            return { tempId: action.tempId, realId: result.id };
        })
    );
    const keyPointTempIdMap = new Map<number, number>();
    for (const result of keyPointCreateResults) {
        if (result.status === 'fulfilled') {
            keyPointTempIdMap.set(result.value.tempId, result.value.realId);
        } else {
            errors.push(errorFromReason(result.reason, 'Work key points'));
        }
    }
    work.applySaveResults(new Map([...workTempIdMap, ...keyPointTempIdMap]));
    work.commitBaseline();

    const updateResults = await Promise.allSettled([
        ...workUpdates.map((action) => updateWorkExperience(action.id, action.payload)),
        ...keyPointUpdates.map((action) => updateWorkExperienceKeyPoint(action.id, action.payload))
    ]);
    for (const result of updateResults) {
        if (result.status === 'rejected') errors.push(errorFromReason(result.reason, 'Work'));
    }
    work.commitBaseline();

    const childDeleteResults = await Promise.allSettled(
        keyPointDeletes.map((action) => deleteWorkExperienceKeyPoint(action.id))
    );
    for (const result of childDeleteResults) {
        if (result.status === 'rejected')
            errors.push(errorFromReason(result.reason, 'Work key points'));
    }
    work.commitBaseline();

    const parentDeleteResults = await Promise.allSettled(
        workDeletes.map((action) => deleteWorkExperience(action.id))
    );
    for (const result of parentDeleteResults) {
        if (result.status === 'rejected') errors.push(errorFromReason(result.reason, 'Work'));
    }
    work.commitBaseline();

    return { errors };
}

async function processPortfolioSection(resumeId: number): Promise<{ errors: SectionError[] }> {
    const errors: SectionError[] = [];
    const actions = portfolio.computeDiff();
    const projectCreates = actions.filter((a) => a.type === 'createProject');
    const keyPointCreates = actions.filter((a) => a.type === 'createKeyPoint');
    const technologyCreates = actions.filter((a) => a.type === 'createTechnology');
    const projectUpdates = actions.filter((a) => a.type === 'updateProject');
    const keyPointUpdates = actions.filter((a) => a.type === 'updateKeyPoint');
    const technologyUpdates = actions.filter((a) => a.type === 'updateTechnology');
    const projectDeletes = actions.filter((a) => a.type === 'deleteProject');
    const keyPointDeletes = actions.filter((a) => a.type === 'deleteKeyPoint');
    const technologyDeletes = actions.filter((a) => a.type === 'deleteTechnology');

    const projectCreateResults = await Promise.allSettled(
        projectCreates.map(async (action) => {
            const result = await createPortfolioProject(resumeId, action.payload);
            return { tempId: action.tempId, realId: result.id };
        })
    );
    const projectTempIdMap = new Map<number, number>();
    for (const result of projectCreateResults) {
        if (result.status === 'fulfilled') {
            projectTempIdMap.set(result.value.tempId, result.value.realId);
        } else {
            errors.push(errorFromReason(result.reason, 'Portfolio'));
        }
    }
    portfolio.applySaveResults(projectTempIdMap);
    portfolio.commitBaseline();

    const keyPointCreateResults = await Promise.allSettled(
        keyPointCreates.map(async (action) => {
            const projectId = projectTempIdMap.get(action.projectId) ?? action.projectId;
            const result = await createPortfolioKeyPoint(resumeId, projectId, action.payload);
            return { tempId: action.tempId, realId: result.id };
        })
    );
    const keyPointTempIdMap = new Map<number, number>();
    for (const result of keyPointCreateResults) {
        if (result.status === 'fulfilled') {
            keyPointTempIdMap.set(result.value.tempId, result.value.realId);
        } else {
            errors.push(errorFromReason(result.reason, 'Portfolio key points'));
        }
    }

    const technologyCreateResults = await Promise.allSettled(
        technologyCreates.map(async (action) => {
            const projectId = projectTempIdMap.get(action.projectId) ?? action.projectId;
            const result = await createPortfolioTechnology(resumeId, projectId, action.payload);
            return { tempId: action.tempId, realId: result.id };
        })
    );
    const technologyTempIdMap = new Map<number, number>();
    for (const result of technologyCreateResults) {
        if (result.status === 'fulfilled') {
            technologyTempIdMap.set(result.value.tempId, result.value.realId);
        } else {
            errors.push(errorFromReason(result.reason, 'Portfolio technologies'));
        }
    }
    portfolio.applySaveResults(
        new Map([...projectTempIdMap, ...keyPointTempIdMap, ...technologyTempIdMap])
    );
    portfolio.commitBaseline();

    const updateResults = await Promise.allSettled([
        ...projectUpdates.map((action) => updatePortfolioProject(action.id, action.payload)),
        ...keyPointUpdates.map((action) => updatePortfolioKeyPoint(action.id, action.payload)),
        ...technologyUpdates.map((action) => updatePortfolioTechnology(action.id, action.payload))
    ]);
    for (const result of updateResults) {
        if (result.status === 'rejected') errors.push(errorFromReason(result.reason, 'Portfolio'));
    }
    portfolio.commitBaseline();

    const childDeleteResults = await Promise.allSettled([
        ...keyPointDeletes.map((action) => deletePortfolioKeyPoint(action.id)),
        ...technologyDeletes.map((action) => deletePortfolioTechnology(action.id))
    ]);
    for (const result of childDeleteResults) {
        if (result.status === 'rejected') errors.push(errorFromReason(result.reason, 'Portfolio'));
    }
    portfolio.commitBaseline();

    const parentDeleteResults = await Promise.allSettled(
        projectDeletes.map((action) => deletePortfolioProject(action.id))
    );
    for (const result of parentDeleteResults) {
        if (result.status === 'rejected') errors.push(errorFromReason(result.reason, 'Portfolio'));
    }
    portfolio.commitBaseline();

    return { errors };
}

async function processLanguagesSection(resumeId: number): Promise<{ errors: SectionError[] }> {
    const errors: SectionError[] = [];
    const actions = languages.computeDiff();
    const languageCreates = actions.filter((a) => a.type === 'createLanguage');
    const frameworkCreates = actions.filter((a) => a.type === 'createFramework');
    const languageUpdates = actions.filter((a) => a.type === 'updateLanguage');
    const frameworkUpdates = actions.filter((a) => a.type === 'updateFramework');
    const languageDeletes = actions.filter((a) => a.type === 'deleteLanguage');
    const frameworkDeletes = actions.filter((a) => a.type === 'deleteFramework');

    const languageCreateResults = await Promise.allSettled(
        languageCreates.map(async (action) => {
            const result = await createLanguage(resumeId, action.payload);
            return { tempId: action.tempId, realId: result.id };
        })
    );
    const languageTempIdMap = new Map<number, number>();
    for (const result of languageCreateResults) {
        if (result.status === 'fulfilled') {
            languageTempIdMap.set(result.value.tempId, result.value.realId);
        } else {
            errors.push(errorFromReason(result.reason, 'Languages'));
        }
    }
    languages.applySaveResults(languageTempIdMap);
    languages.commitBaseline();

    const frameworkCreateResults = await Promise.allSettled(
        frameworkCreates.map(async (action) => {
            const languageId = languageTempIdMap.get(action.languageId) ?? action.languageId;
            const result = await createFramework(resumeId, languageId, action.payload);
            return { tempId: action.tempId, realId: result.id };
        })
    );
    const frameworkTempIdMap = new Map<number, number>();
    for (const result of frameworkCreateResults) {
        if (result.status === 'fulfilled') {
            frameworkTempIdMap.set(result.value.tempId, result.value.realId);
        } else {
            errors.push(errorFromReason(result.reason, 'Language frameworks'));
        }
    }
    languages.applySaveResults(new Map([...languageTempIdMap, ...frameworkTempIdMap]));
    languages.commitBaseline();

    const updateResults = await Promise.allSettled([
        ...languageUpdates.map((action) => updateLanguage(action.id, action.payload)),
        ...frameworkUpdates.map((action) => updateFramework(action.id, action.payload))
    ]);
    for (const result of updateResults) {
        if (result.status === 'rejected') errors.push(errorFromReason(result.reason, 'Languages'));
    }
    languages.commitBaseline();

    const childDeleteResults = await Promise.allSettled(
        frameworkDeletes.map((action) => deleteFramework(action.id))
    );
    for (const result of childDeleteResults) {
        if (result.status === 'rejected')
            errors.push(errorFromReason(result.reason, 'Language frameworks'));
    }
    languages.commitBaseline();

    const parentDeleteResults = await Promise.allSettled(
        languageDeletes.map((action) => deleteLanguage(action.id))
    );
    for (const result of parentDeleteResults) {
        if (result.status === 'rejected') errors.push(errorFromReason(result.reason, 'Languages'));
    }
    languages.commitBaseline();

    return { errors };
}
