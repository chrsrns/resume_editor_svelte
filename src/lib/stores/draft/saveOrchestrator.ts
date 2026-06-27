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

export async function saveAll(resumeId: number): Promise<SaveResult> {
    const errors: Array<{ section: string; error: string }> = [];

    try {
        // Phase 1: Resume (basics)
        if (basics.isDirty()) {
            await updateResume(resumeId, basics.toUpdatePayload());
        }

        // Phase 2: Skills creations
        const skillActions = skills.computeDiff();
        const skillCreations = skillActions.filter((a) => a.type === 'create');

        const skillCreationResults = await Promise.allSettled(
            skillCreations.map(async (action) => {
                const result = await createSkill(resumeId, action.payload);
                return { action, realId: result.id };
            })
        );

        // Build tempId -> realId mapping
        const tempIdMap = new Map<number, number>();
        for (const result of skillCreationResults) {
            if (result.status === 'fulfilled') {
                tempIdMap.set(result.value.action.tempId, result.value.realId);
            }
        }

        // Apply successful creations
        skills.applySaveResults(tempIdMap);

        // Phase 3: Skills updates and deletions
        const skillUpdatesAndDeletes = skillActions.filter(
            (a) => a.type === 'update' || a.type === 'delete'
        );

        const skillUpdateDeleteResults = await Promise.allSettled(
            skillUpdatesAndDeletes.map(async (action) => {
                if (action.type === 'delete') {
                    await deleteSkill(action.id);
                    return { action };
                } else {
                    await updateSkill(action.id, action.payload);
                    return { action };
                }
            })
        );

        // Phase 4: Education creations
        const educationActions = education.computeDiff();
        const educationCreations = educationActions.filter((a) => a.type === 'createEducation');

        const educationCreationResults = await Promise.allSettled(
            educationCreations.map(async (action) => {
                const result = await createEducation(resumeId, action.payload);
                return { action, realId: result.id };
            })
        );

        // Build education tempId -> realId mapping
        const educationTempIdMap = new Map<number, number>();
        for (const result of educationCreationResults) {
            if (result.status === 'fulfilled') {
                educationTempIdMap.set(result.value.action.tempId, result.value.realId);
            }
        }

        // Phase 5: Key point creations (after education creations)
        const keyPointCreations = educationActions.filter((a) => a.type === 'createKeyPoint');

        const keyPointCreationResults = await Promise.allSettled(
            keyPointCreations.map(async (action) => {
                // Map temp education IDs to real IDs if needed
                const educationId =
                    educationTempIdMap.get(action.educationId) ?? action.educationId;
                const result = await createEducationKeyPoint(resumeId, educationId, action.payload);
                return { action, realId: result.id };
            })
        );

        // Build key point tempId -> realId mapping
        const keyPointTempIdMap = new Map<number, number>();
        for (const result of keyPointCreationResults) {
            if (result.status === 'fulfilled') {
                keyPointTempIdMap.set(result.value.action.tempId, result.value.realId);
            }
        }

        // Combine temp ID maps
        const combinedTempIdMap = new Map([...educationTempIdMap, ...keyPointTempIdMap]);

        // Apply successful creations
        education.applySaveResults(combinedTempIdMap);

        // Phase 6: Education updates and deletions
        const educationUpdatesAndDeletes = educationActions.filter(
            (a) => a.type === 'updateEducation' || a.type === 'deleteEducation'
        );

        const educationUpdateDeleteResults = await Promise.allSettled(
            educationUpdatesAndDeletes.map(async (action) => {
                if (action.type === 'deleteEducation') {
                    await deleteEducation(action.id);
                    return { action };
                } else {
                    await updateEducation(action.id, action.payload);
                    return { action };
                }
            })
        );

        // Phase 7: Key point updates and deletions
        const keyPointUpdatesAndDeletes = educationActions.filter(
            (a) => a.type === 'updateKeyPoint' || a.type === 'deleteKeyPoint'
        );

        const keyPointUpdateDeleteResults = await Promise.allSettled(
            keyPointUpdatesAndDeletes.map(async (action) => {
                if (action.type === 'deleteKeyPoint') {
                    await deleteEducationKeyPoint(action.id);
                    return { action };
                } else {
                    await updateEducationKeyPoint(action.id, action.payload);
                    return { action };
                }
            })
        );

        // Phase 8: Work creations
        const workActions = work.computeDiff();
        const workCreations = workActions.filter((a) => a.type === 'createWork');

        const workCreationResults = await Promise.allSettled(
            workCreations.map(async (action) => {
                const result = await createWorkExperience(resumeId, action.payload);
                return { action, realId: result.id };
            })
        );

        // Build work tempId -> realId mapping
        const workTempIdMap = new Map<number, number>();
        for (const result of workCreationResults) {
            if (result.status === 'fulfilled') {
                workTempIdMap.set(result.value.action.tempId, result.value.realId);
            }
        }

        // Phase 9: Work key point creations (after work creations)
        const workKeyPointCreations = workActions.filter((a) => a.type === 'createKeyPoint');

        const workKeyPointCreationResults = await Promise.allSettled(
            workKeyPointCreations.map(async (action) => {
                // Map temp work IDs to real IDs if needed
                const workId = workTempIdMap.get(action.workId) ?? action.workId;
                const result = await createWorkExperienceKeyPoint(resumeId, workId, action.payload);
                return { action, realId: result.id };
            })
        );

        // Build work key point tempId -> realId mapping
        const workKeyPointTempIdMap = new Map<number, number>();
        for (const result of workKeyPointCreationResults) {
            if (result.status === 'fulfilled') {
                workKeyPointTempIdMap.set(result.value.action.tempId, result.value.realId);
            }
        }

        // Combine work temp ID maps
        const workCombinedTempIdMap = new Map([...workTempIdMap, ...workKeyPointTempIdMap]);

        // Apply successful work creations
        work.applySaveResults(workCombinedTempIdMap);

        // Phase 10: Work updates and deletions
        const workUpdatesAndDeletes = workActions.filter(
            (a) => a.type === 'updateWork' || a.type === 'deleteWork'
        );

        const workUpdateDeleteResults = await Promise.allSettled(
            workUpdatesAndDeletes.map(async (action) => {
                if (action.type === 'deleteWork') {
                    await deleteWorkExperience(action.id);
                    return { action };
                } else {
                    await updateWorkExperience(action.id, action.payload);
                    return { action };
                }
            })
        );

        // Phase 11: Work key point updates and deletions
        const workKeyPointUpdatesAndDeletes = workActions.filter(
            (a) => a.type === 'updateKeyPoint' || a.type === 'deleteKeyPoint'
        );

        const workKeyPointUpdateDeleteResults = await Promise.allSettled(
            workKeyPointUpdatesAndDeletes.map(async (action) => {
                if (action.type === 'deleteKeyPoint') {
                    await deleteWorkExperienceKeyPoint(action.id);
                    return { action };
                } else {
                    await updateWorkExperienceKeyPoint(action.id, action.payload);
                    return { action };
                }
            })
        );

        // Phase 12: Portfolio project creations
        const portfolioActions = portfolio.computeDiff();
        const portfolioCreations = portfolioActions.filter((a) => a.type === 'createProject');

        const portfolioCreationResults = await Promise.allSettled(
            portfolioCreations.map(async (action) => {
                const result = await createPortfolioProject(resumeId, action.payload);
                return { action, realId: result.id };
            })
        );

        // Build portfolio tempId -> realId mapping
        const portfolioTempIdMap = new Map<number, number>();
        for (const result of portfolioCreationResults) {
            if (result.status === 'fulfilled') {
                portfolioTempIdMap.set(result.value.action.tempId, result.value.realId);
            }
        }

        // Phase 13: Portfolio key point creations (after project creations)
        const portfolioKeyPointCreations = portfolioActions.filter(
            (a) => a.type === 'createKeyPoint'
        );

        const portfolioKeyPointCreationResults = await Promise.allSettled(
            portfolioKeyPointCreations.map(async (action) => {
                // Map temp project IDs to real IDs if needed
                const projectId = portfolioTempIdMap.get(action.projectId) ?? action.projectId;
                const result = await createPortfolioKeyPoint(resumeId, projectId, action.payload);
                return { action, realId: result.id };
            })
        );

        // Build portfolio key point tempId -> realId mapping
        const portfolioKeyPointTempIdMap = new Map<number, number>();
        for (const result of portfolioKeyPointCreationResults) {
            if (result.status === 'fulfilled') {
                portfolioKeyPointTempIdMap.set(result.value.action.tempId, result.value.realId);
            }
        }

        // Phase 14: Portfolio technology creations (after project creations)
        const portfolioTechnologyCreations = portfolioActions.filter(
            (a) => a.type === 'createTechnology'
        );

        const portfolioTechnologyCreationResults = await Promise.allSettled(
            portfolioTechnologyCreations.map(async (action) => {
                // Map temp project IDs to real IDs if needed
                const projectId = portfolioTempIdMap.get(action.projectId) ?? action.projectId;
                const result = await createPortfolioTechnology(resumeId, projectId, action.payload);
                return { action, realId: result.id };
            })
        );

        // Build portfolio technology tempId -> realId mapping
        const portfolioTechnologyTempIdMap = new Map<number, number>();
        for (const result of portfolioTechnologyCreationResults) {
            if (result.status === 'fulfilled') {
                portfolioTechnologyTempIdMap.set(result.value.action.tempId, result.value.realId);
            }
        }

        // Combine portfolio temp ID maps
        const portfolioCombinedTempIdMap = new Map([
            ...portfolioTempIdMap,
            ...portfolioKeyPointTempIdMap,
            ...portfolioTechnologyTempIdMap
        ]);

        // Apply successful portfolio creations
        portfolio.applySaveResults(portfolioCombinedTempIdMap);

        // Phase 15: Portfolio project updates and deletions
        const portfolioUpdatesAndDeletes = portfolioActions.filter(
            (a) => a.type === 'updateProject' || a.type === 'deleteProject'
        );

        const portfolioUpdateDeleteResults = await Promise.allSettled(
            portfolioUpdatesAndDeletes.map(async (action) => {
                if (action.type === 'deleteProject') {
                    await deletePortfolioProject(action.id);
                    return { action };
                } else {
                    await updatePortfolioProject(action.id, action.payload);
                    return { action };
                }
            })
        );

        // Phase 16: Portfolio key point updates and deletions
        const portfolioKeyPointUpdatesAndDeletes = portfolioActions.filter(
            (a) => a.type === 'updateKeyPoint' || a.type === 'deleteKeyPoint'
        );

        const portfolioKeyPointUpdateDeleteResults = await Promise.allSettled(
            portfolioKeyPointUpdatesAndDeletes.map(async (action) => {
                if (action.type === 'deleteKeyPoint') {
                    await deletePortfolioKeyPoint(action.id);
                    return { action };
                } else {
                    await updatePortfolioKeyPoint(action.id, action.payload);
                    return { action };
                }
            })
        );

        // Phase 17: Portfolio technology updates and deletions
        const portfolioTechnologyUpdatesAndDeletes = portfolioActions.filter(
            (a) => a.type === 'updateTechnology' || a.type === 'deleteTechnology'
        );

        const portfolioTechnologyUpdateDeleteResults = await Promise.allSettled(
            portfolioTechnologyUpdatesAndDeletes.map(async (action) => {
                if (action.type === 'deleteTechnology') {
                    await deletePortfolioTechnology(action.id);
                    return { action };
                } else {
                    await updatePortfolioTechnology(action.id, action.payload);
                    return { action };
                }
            })
        );

        // Phase 18: Language creations
        const languagesActions = languages.computeDiff();
        const languageCreations = languagesActions.filter((a) => a.type === 'createLanguage');

        const languageCreationResults = await Promise.allSettled(
            languageCreations.map(async (action) => {
                const result = await createLanguage(resumeId, action.payload);
                return { action, realId: result.id };
            })
        );

        // Build language tempId -> realId mapping
        const languageTempIdMap = new Map<number, number>();
        for (const result of languageCreationResults) {
            if (result.status === 'fulfilled') {
                languageTempIdMap.set(result.value.action.tempId, result.value.realId);
            }
        }

        // Phase 19: Framework creations (after language creations)
        const frameworkCreations = languagesActions.filter((a) => a.type === 'createFramework');

        const frameworkCreationResults = await Promise.allSettled(
            frameworkCreations.map(async (action) => {
                // Map temp language IDs to real IDs if needed
                const languageId = languageTempIdMap.get(action.languageId) ?? action.languageId;
                const result = await createFramework(resumeId, languageId, action.payload);
                return { action, realId: result.id };
            })
        );

        // Build framework tempId -> realId mapping
        const frameworkTempIdMap = new Map<number, number>();
        for (const result of frameworkCreationResults) {
            if (result.status === 'fulfilled') {
                frameworkTempIdMap.set(result.value.action.tempId, result.value.realId);
            }
        }

        // Combine language temp ID maps
        const languageCombinedTempIdMap = new Map([...languageTempIdMap, ...frameworkTempIdMap]);

        // Apply successful language creations
        languages.applySaveResults(languageCombinedTempIdMap);

        // Phase 20: Language updates and deletions
        const languageUpdatesAndDeletes = languagesActions.filter(
            (a) => a.type === 'updateLanguage' || a.type === 'deleteLanguage'
        );

        const languageUpdateDeleteResults = await Promise.allSettled(
            languageUpdatesAndDeletes.map(async (action) => {
                if (action.type === 'deleteLanguage') {
                    await deleteLanguage(action.id);
                    return { action };
                } else {
                    await updateLanguage(action.id, action.payload);
                    return { action };
                }
            })
        );

        // Phase 21: Framework updates and deletions
        const frameworkUpdatesAndDeletes = languagesActions.filter(
            (a) => a.type === 'updateFramework' || a.type === 'deleteFramework'
        );

        const frameworkUpdateDeleteResults = await Promise.allSettled(
            frameworkUpdatesAndDeletes.map(async (action) => {
                if (action.type === 'deleteFramework') {
                    await deleteFramework(action.id);
                    return { action };
                } else {
                    await updateFramework(action.id, action.payload);
                    return { action };
                }
            })
        );

        // Check for failures
        const failures = [
            ...skillCreationResults.filter((r) => r.status === 'rejected'),
            ...skillUpdateDeleteResults.filter((r) => r.status === 'rejected'),
            ...educationCreationResults.filter((r) => r.status === 'rejected'),
            ...keyPointCreationResults.filter((r) => r.status === 'rejected'),
            ...educationUpdateDeleteResults.filter((r) => r.status === 'rejected'),
            ...keyPointUpdateDeleteResults.filter((r) => r.status === 'rejected'),
            ...workCreationResults.filter((r) => r.status === 'rejected'),
            ...workKeyPointCreationResults.filter((r) => r.status === 'rejected'),
            ...workUpdateDeleteResults.filter((r) => r.status === 'rejected'),
            ...workKeyPointUpdateDeleteResults.filter((r) => r.status === 'rejected'),
            ...portfolioCreationResults.filter((r) => r.status === 'rejected'),
            ...portfolioKeyPointCreationResults.filter((r) => r.status === 'rejected'),
            ...portfolioTechnologyCreationResults.filter((r) => r.status === 'rejected'),
            ...portfolioUpdateDeleteResults.filter((r) => r.status === 'rejected'),
            ...portfolioKeyPointUpdateDeleteResults.filter((r) => r.status === 'rejected'),
            ...portfolioTechnologyUpdateDeleteResults.filter((r) => r.status === 'rejected'),
            ...languageCreationResults.filter((r) => r.status === 'rejected'),
            ...frameworkCreationResults.filter((r) => r.status === 'rejected'),
            ...languageUpdateDeleteResults.filter((r) => r.status === 'rejected'),
            ...frameworkUpdateDeleteResults.filter((r) => r.status === 'rejected')
        ];

        if (failures.length > 0) {
            for (const failure of failures) {
                if (failure.status === 'rejected') {
                    const err = failure.reason as ApiError;
                    errors.push({
                        section: 'Unknown',
                        error: err.message || 'Failed to save item'
                    });
                }
            }

            return {
                success: false,
                message: `Failed to save ${failures.length} item(s). Please fix the errors and try again.`,
                errors
            };
        } else {
            // Full success: commit baselines for all sections
            basics.commitBaseline();
            skills.commitBaseline();
            education.commitBaseline();
            work.commitBaseline();
            portfolio.commitBaseline();
            languages.commitBaseline();

            return {
                success: true,
                message: 'All changes saved successfully!',
                errors: []
            };
        }
    } catch (e) {
        const err = e as ApiError;
        return {
            success: false,
            message: err.message || 'An unexpected error occurred',
            errors: [{ section: 'System', error: err.message || 'Unknown error' }]
        };
    }
}
