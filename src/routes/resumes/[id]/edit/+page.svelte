<script lang="ts">
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import { SvelteURLSearchParams } from 'svelte/reactivity';
    import { page } from '$app/state';
    import { resolve } from '$app/paths';
    import { deleteResume, getResume, updateResume } from '$lib/api/resumes';
    import { createSkill, deleteSkill, listSkills, updateSkill } from '$lib/api/skills';
    import {
        createEducation,
        deleteEducation,
        listEducations,
        updateEducation,
        listEducationKeyPoints,
        createEducationKeyPoint,
        updateEducationKeyPoint,
        deleteEducationKeyPoint
    } from '$lib/api/education';
    import {
        listWorkExperiences,
        listWorkExperienceKeyPoints,
        createWorkExperience,
        updateWorkExperience,
        deleteWorkExperience,
        createWorkExperienceKeyPoint,
        updateWorkExperienceKeyPoint,
        deleteWorkExperienceKeyPoint
    } from '$lib/api/work-experience';
    import {
        listPortfolioProjects,
        listPortfolioKeyPoints,
        listPortfolioTechnologies,
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
    import {
        listLanguages,
        createLanguage,
        updateLanguage,
        deleteLanguage
    } from '$lib/api/languages';
    import {
        listFrameworks,
        createFramework,
        updateFramework,
        deleteFramework
    } from '$lib/api/frameworks';
    import type { ApiError } from '$lib/api/client';
    import ResumeForm from '$lib/components/ResumeForm.svelte';
    import EducationSection from '$lib/components/sections/EducationSection.svelte';
    import LanguagesFrameworksSection from '$lib/components/sections/LanguagesFrameworksSection.svelte';
    import PortfolioProjectsSection from '$lib/components/sections/PortfolioProjectsSection.svelte';
    import SkillsSection from '$lib/components/sections/SkillsSection.svelte';
    import WorkExperiencesSection from '$lib/components/sections/WorkExperiencesSection.svelte';
    import type {
        Resume,
        EducationKeyPoint,
        WorkExperienceKeyPoint,
        PortfolioKeyPoint,
        PortfolioTechnology,
        Framework
    } from '$lib/types';
    import { authToken } from '$lib/auth';
    import { currentUser } from '$lib/session';
    import { basics, skills, education, work, portfolio, languages } from '$lib/stores/draft';
    import IconTabBar from '$lib/components/IconTabBar.svelte';
    import Button from '$lib/components/ui/Button.svelte';
    import User from '@lucide/svelte/icons/user';
    import GraduationCap from '@lucide/svelte/icons/graduation-cap';
    import Briefcase from '@lucide/svelte/icons/briefcase';
    import Folder from '@lucide/svelte/icons/folder';
    import Star from '@lucide/svelte/icons/star';
    import Globe from '@lucide/svelte/icons/globe';
    import ChevronLeft from '@lucide/svelte/icons/chevron-left';
    import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
    import Trash2 from '@lucide/svelte/icons/trash-2';
    import Save from '@lucide/svelte/icons/save';

    const tabs = [
        { id: 'basics', label: 'Basics' },
        { id: 'education', label: 'Education' },
        { id: 'work', label: 'Work' },
        { id: 'portfolio', label: 'Portfolio' },
        { id: 'skills', label: 'Skills' },
        { id: 'languages', label: 'Languages & Frameworks' }
    ] as const;

    const tabIcons = [
        { id: 'basics', label: 'Basics', Icon: User },
        { id: 'education', label: 'Education', Icon: GraduationCap },
        { id: 'work', label: 'Work', Icon: Briefcase },
        { id: 'portfolio', label: 'Portfolio', Icon: Folder },
        { id: 'skills', label: 'Skills', Icon: Star },
        { id: 'languages', label: 'Languages & Frameworks', Icon: Globe }
    ] as const;

    type TabId = (typeof tabs)[number]['id'];

    function parseTabId(value: string | null): TabId {
        const v = value ?? '';
        const found = tabs.find((t) => t.id === v);
        return found ? found.id : 'basics';
    }

    let resume = $state<Resume | null>(null);
    let loading = $state(true);
    let saving = $state(false);
    let deleting = $state(false);
    let error = $state<string | null>(null);
    let activeTab = $derived(parseTabId(page.url.searchParams.get('tab')));

    // Global dirty state (basics + skills + education + work + portfolio + languages)
    const isDirty = $derived(
        basics.isDirty() ||
            skills.isDirty() ||
            education.isDirty() ||
            work.isDirty() ||
            portfolio.isDirty() ||
            languages.isDirty()
    );

    // Global validation errors
    const hasValidationErrors = $derived(
        basics.getValidationError() !== null ||
            skills.getValidationErrors().length > 0 ||
            education.getValidationErrors().length > 0 ||
            work.getValidationErrors().length > 0 ||
            portfolio.getValidationErrors().length > 0 ||
            languages.getValidationErrors().length > 0
    );

    // Reactive visible drafts for SkillsSection
    const visibleSkillDrafts = $derived.by(() => skills.getVisibleDrafts());

    // Reactive visible drafts for EducationSection
    const visibleEducationDrafts = $derived.by(() => education.getVisibleDrafts());
    const visibleKeyPoints = $derived.by(() => {
        const result: Record<number, ReturnType<typeof education.getVisibleKeyPoints>> = {};
        for (const draft of education.getVisibleDrafts()) {
            result[draft.id] = education.getVisibleKeyPoints(draft.id);
        }
        return result;
    });

    // Reactive visible drafts for WorkExperiencesSection
    const visibleWorkDrafts = $derived.by(() => work.getVisibleDrafts());
    const visibleWorkKeyPoints = $derived.by(() => {
        const result: Record<number, ReturnType<typeof work.getVisibleKeyPoints>> = {};
        for (const draft of work.getVisibleDrafts()) {
            result[draft.id] = work.getVisibleKeyPoints(draft.id);
        }
        return result;
    });

    // Reactive visible drafts for PortfolioProjectsSection
    const visiblePortfolioDrafts = $derived.by(() => portfolio.getVisibleDrafts());
    const visiblePortfolioKeyPoints = $derived.by(() => {
        const result: Record<number, ReturnType<typeof portfolio.getVisibleKeyPoints>> = {};
        for (const draft of portfolio.getVisibleDrafts()) {
            result[draft.id] = portfolio.getVisibleKeyPoints(draft.id);
        }
        return result;
    });
    const visiblePortfolioTechnologies = $derived.by(() => {
        const result: Record<number, ReturnType<typeof portfolio.getVisibleTechnologies>> = {};
        for (const draft of portfolio.getVisibleDrafts()) {
            result[draft.id] = portfolio.getVisibleTechnologies(draft.id);
        }
        return result;
    });

    // Reactive visible drafts for LanguagesFrameworksSection
    const visibleLanguageDrafts = $derived.by(() => languages.getVisibleDrafts());
    const visibleLanguageFrameworks = $derived.by(() => {
        const result: Record<number, ReturnType<typeof languages.getVisibleFrameworks>> = {};
        for (const draft of languages.getVisibleDrafts()) {
            result[draft.id] = languages.getVisibleFrameworks(draft.id);
        }
        return result;
    });

    function onTabListKeydown(e: KeyboardEvent) {
        const tablist = e.currentTarget as HTMLElement | null;
        if (!tablist) return;

        const buttons = Array.from(
            tablist.querySelectorAll<HTMLButtonElement>('button[role="tab"]')
        );
        if (buttons.length === 0) return;

        const focusedIndex = buttons.findIndex((b) => b === document.activeElement);
        const activeIndex = Math.max(
            0,
            tabs.findIndex((t) => t.id === activeTab)
        );
        const idx = focusedIndex >= 0 ? focusedIndex : activeIndex;

        function focusAt(nextIndex: number) {
            const count = buttons.length;
            const next = ((nextIndex % count) + count) % count;
            buttons[next]?.focus();
        }

        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                focusAt(idx - 1);
                break;
            case 'ArrowRight':
                e.preventDefault();
                focusAt(idx + 1);
                break;
            case 'Home':
                e.preventDefault();
                focusAt(0);
                break;
            case 'End':
                e.preventDefault();
                focusAt(buttons.length - 1);
                break;
            case 'Enter':
            case ' ': {
                e.preventDefault();
                const el = document.activeElement as HTMLButtonElement | null;
                const raw = el?.dataset.tab ?? null;
                selectTab(parseTabId(raw));
                break;
            }
        }
    }

    function selectTab(id: string) {
        const params = new SvelteURLSearchParams(page.url.searchParams);
        params.set('tab', id);
        void goto(resolve(`/resumes/${page.params.id}/edit?${params.toString()}`), {
            replaceState: false,
            noScroll: true,
            keepFocus: true
        });
    }

    async function load() {
        loading = true;
        error = null;
        try {
            const id = Number(page.params.id);
            resume = await getResume(id);

            // Initialize draft modules
            basics.initialize(resume);
            const skillsData = await listSkills(resume.id);
            skills.initialize(skillsData);

            // Load education data
            const educationData = await listEducations(resume.id);
            const keyPointsData: EducationKeyPoint[] = [];
            for (const edu of educationData) {
                const kps = await listEducationKeyPoints(resume.id, edu.id);
                keyPointsData.push(...kps);
            }
            education.initialize(educationData, keyPointsData);

            // Load work data
            const workData = await listWorkExperiences(resume.id);
            const workKeyPointsData: WorkExperienceKeyPoint[] = [];
            for (const exp of workData) {
                const kps = await listWorkExperienceKeyPoints(resume.id, exp.id);
                workKeyPointsData.push(...kps);
            }
            work.initialize(workData, workKeyPointsData);

            // Load portfolio data
            const portfolioData = await listPortfolioProjects(resume.id);
            const portfolioKeyPointsData: PortfolioKeyPoint[] = [];
            const portfolioTechnologiesData: PortfolioTechnology[] = [];
            for (const proj of portfolioData) {
                const kps = await listPortfolioKeyPoints(resume.id, proj.id);
                portfolioKeyPointsData.push(...kps);
                const techs = await listPortfolioTechnologies(resume.id, proj.id);
                portfolioTechnologiesData.push(...techs);
            }
            portfolio.initialize(portfolioData, portfolioKeyPointsData, portfolioTechnologiesData);

            // Load languages data
            const languagesData = await listLanguages(resume.id);
            const frameworksData: Framework[] = [];
            for (const lang of languagesData) {
                const fws = await listFrameworks(resume.id, lang.id);
                frameworksData.push(...fws);
            }
            languages.initialize(languagesData, frameworksData);
        } catch (e) {
            const err = e as ApiError;
            error = err.message;
        } finally {
            loading = false;
        }
    }

    onMount(() => {
        if (!$authToken) {
            void goto(resolve('/auth/login'));
            return;
        }
        void load();
    });

    async function handleUnifiedSave() {
        if (!resume || hasValidationErrors) return;

        saving = true;
        error = null;

        try {
            // Phase 1: Resume (basics)
            if (basics.isDirty()) {
                await updateResume(resume.id, basics.toUpdatePayload());
                basics.applySaveResults();
            }

            // Phase 2: Skills creations
            const skillActions = skills.computeDiff();
            const skillCreations = skillActions.filter((a) => a.type === 'create');

            const skillCreationResults = await Promise.allSettled(
                skillCreations.map(async (action) => {
                    const result = await createSkill(resume!.id, action.payload);
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
                    const result = await createEducation(resume!.id, action.payload);
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
                    const result = await createEducationKeyPoint(
                        resume!.id,
                        educationId,
                        action.payload
                    );
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
                    const result = await createWorkExperience(resume!.id, action.payload);
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
                    const result = await createWorkExperienceKeyPoint(
                        resume!.id,
                        workId,
                        action.payload
                    );
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
                    const result = await createPortfolioProject(resume!.id, action.payload);
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
                    const result = await createPortfolioKeyPoint(
                        resume!.id,
                        projectId,
                        action.payload
                    );
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
                    const result = await createPortfolioTechnology(
                        resume!.id,
                        projectId,
                        action.payload
                    );
                    return { action, realId: result.id };
                })
            );

            // Build portfolio technology tempId -> realId mapping
            const portfolioTechnologyTempIdMap = new Map<number, number>();
            for (const result of portfolioTechnologyCreationResults) {
                if (result.status === 'fulfilled') {
                    portfolioTechnologyTempIdMap.set(
                        result.value.action.tempId,
                        result.value.realId
                    );
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
                    const result = await createLanguage(resume!.id, action.payload);
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
                    const languageId =
                        languageTempIdMap.get(action.languageId) ?? action.languageId;
                    const result = await createFramework(resume!.id, languageId, action.payload);
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
            const languageCombinedTempIdMap = new Map([
                ...languageTempIdMap,
                ...frameworkTempIdMap
            ]);

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
                const failedIds = new Set<number>();
                for (const failure of failures) {
                    if (failure.status === 'rejected') {
                        // Extract the ID from the action (this is a simplification)
                        // In production, we'd track this more carefully
                        error = failure.reason.message;
                    }
                }
                // Keep failed items in dirty state
                // skills.keepFailedItems(failedIds);
                // education.keepFailedItems(failedIds);
                // work.keepFailedItems(failedIds);
                // portfolio.keepFailedItems(failedIds);
                // languages.keepFailedItems(failedIds);
            } else {
                // Full success: baselines already updated by applySaveResults
                // No need to reload from server
            }
        } catch (e) {
            const err = e as ApiError;
            error = err.message;
        } finally {
            saving = false;
        }
    }

    function handleDiscard() {
        if (!confirm('Discard all unsaved changes?')) return;
        basics.resetToBaseline();
        skills.resetToBaseline();
        education.resetToBaseline();
        work.resetToBaseline();
        portfolio.resetToBaseline();
        languages.resetToBaseline();
        error = null;
    }

    async function handleDelete() {
        if (!resume) return;
        const confirmed = confirm('Delete this resume?');
        if (!confirmed) return;

        error = null;
        deleting = true;
        try {
            await deleteResume(resume.id);
            await goto(resolve('/resumes'));
        } catch (e) {
            const err = e as ApiError;
            error = err.message;
        } finally {
            deleting = false;
        }
    }

    // beforeunload guard for unsaved changes
    $effect(() => {
        if (!isDirty) return;
        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    });
</script>

<svelte:head>
    <title>Editing resume of: {resume?.name} - Resume Editor</title>
</svelte:head>

{#if loading}
    <p class="stateText">Loading…</p>
{:else if error}
    <p class="stateText error">{error}</p>
{:else if resume}
    <div class="header">
        <div>
            <h1>Edit resume</h1>
            <p class="muted">{resume.name}</p>
        </div>
        <div class="actions">
            <Button variant="secondary" onclick={handleDiscard} disabled={saving || !isDirty}>
                {#snippet icon()}<RotateCcw size={16} />{/snippet}
                Discard
            </Button>
            <Button variant="secondary" onclick={() => goto(resolve(`/resumes/${resume!.id}`))}>
                {#snippet icon()}<ChevronLeft size={16} />{/snippet}
                Cancel
            </Button>
            {#if isDirty}
                <Button
                    variant="primary"
                    disabled={saving || hasValidationErrors}
                    onclick={handleUnifiedSave}
                >
                    {#snippet icon()}<Save size={16} />{/snippet}
                    {saving ? 'Saving…' : 'Save'}
                </Button>
            {/if}
            <Button variant="danger" onclick={handleDelete} disabled={deleting}>
                {#snippet icon()}<Trash2 size={16} />{/snippet}
                {deleting ? 'Deleting…' : 'Delete'}
            </Button>
        </div>
    </div>

    {#if $currentUser && resume.created_by !== $currentUser.id}
        <div class="card errorCard">
            <p class="error">Forbidden</p>
        </div>
    {:else}
        <IconTabBar tabs={tabIcons} {activeTab} onselect={selectTab} onkeydown={onTabListKeydown} />

        <div
            class="panel"
            hidden={activeTab !== 'basics'}
            role="tabpanel"
            id="panel-basics"
            aria-labelledby="tab-basics"
            tabindex="0"
        >
            <ResumeForm formId="resume-form" />
        </div>

        <div
            class="panel"
            hidden={activeTab !== 'education'}
            role="tabpanel"
            id="panel-education"
            aria-labelledby="tab-education"
            tabindex="0"
        >
            <EducationSection
                drafts={visibleEducationDrafts}
                keyPoints={visibleKeyPoints}
                onAddEducation={(draft) => education.addEducation(draft)}
                onUpdateEducation={(id, partial) => education.updateEducation(id, partial)}
                onDeleteEducation={(id) => education.removeEducation(id)}
                onReorderEducation={(from, to) => education.reorderEducation(from, to)}
                onAddKeyPoint={(educationId, draft) => education.addKeyPoint(educationId, draft)}
                onUpdateKeyPoint={(id, partial) => education.updateKeyPoint(id, partial)}
                onDeleteKeyPoint={(id) => education.removeKeyPoint(id)}
                onReorderKeyPoint={(educationId, from, to) =>
                    education.reorderKeyPoint(educationId, from, to)}
                {saving}
            />
        </div>
        <div
            class="panel"
            hidden={activeTab !== 'work'}
            role="tabpanel"
            id="panel-work"
            aria-labelledby="tab-work"
            tabindex="0"
        >
            <WorkExperiencesSection
                drafts={visibleWorkDrafts}
                keyPoints={visibleWorkKeyPoints}
                onAddWork={(draft) => work.addWork(draft)}
                onUpdateWork={(id: number, partial) => work.updateWork(id, partial)}
                onRemoveWork={(id: number) => work.removeWork(id)}
                onReorder={(from: number, to: number) => work.reorder(from, to)}
                onToggleActive={(id: number) => {
                    // For now, just a placeholder - active state is not managed in drafts yet
                    // This will be implemented when we add active state to the draft module
                }}
                onAddKeyPoint={(workId: number, draft) => work.addKeyPoint(workId, draft)}
                onUpdateKeyPoint={(id: number, partial) => work.updateKeyPoint(id, partial)}
                onRemoveKeyPoint={(id: number) => work.removeKeyPoint(id)}
                onReorderKeyPoints={(workId: number, from: number, to: number) =>
                    work.reorderKeyPoints(workId, from, to)}
                onValidateWork={(id: number) => work.validateWork(id)}
                onValidateKeyPoint={(id: number) => work.validateKeyPoint(id)}
                {saving}
            />
        </div>
        <div
            class="panel"
            hidden={activeTab !== 'portfolio'}
            role="tabpanel"
            id="panel-portfolio"
            aria-labelledby="tab-portfolio"
            tabindex="0"
        >
            <PortfolioProjectsSection
                drafts={visiblePortfolioDrafts}
                keyPoints={visiblePortfolioKeyPoints}
                technologies={visiblePortfolioTechnologies}
                onAddProject={(draft) => portfolio.addProject(draft)}
                onUpdateProject={(id: number, partial) => portfolio.updateProject(id, partial)}
                onRemoveProject={(id: number) => portfolio.removeProject(id)}
                onAddKeyPoint={(projectId: number, draft) =>
                    portfolio.addKeyPoint(projectId, draft)}
                onUpdateKeyPoint={(id: number, partial) => portfolio.updateKeyPoint(id, partial)}
                onRemoveKeyPoint={(id: number) => portfolio.removeKeyPoint(id)}
                onAddTechnology={(projectId: number, draft) =>
                    portfolio.addTechnology(projectId, draft)}
                onUpdateTechnology={(id: number, partial) =>
                    portfolio.updateTechnology(id, partial)}
                onRemoveTechnology={(id: number) => portfolio.removeTechnology(id)}
                onReorder={(from: number, to: number) => portfolio.reorder(from, to)}
                onReorderKeyPoints={(projectId: number, from: number, to: number) =>
                    portfolio.reorderKeyPoints(projectId, from, to)}
                onReorderTechnologies={(projectId: number, from: number, to: number) =>
                    portfolio.reorderTechnologies(projectId, from, to)}
                onValidateProject={(id: number) => portfolio.validateProject(id)}
                onValidateKeyPoint={(id: number) => portfolio.validateKeyPoint(id)}
                onValidateTechnology={(id: number) => portfolio.validateTechnology(id)}
                {saving}
            />
        </div>
        <div
            class="panel"
            hidden={activeTab !== 'skills'}
            role="tabpanel"
            id="panel-skills"
            aria-labelledby="tab-skills"
            tabindex="0"
        >
            <SkillsSection
                drafts={visibleSkillDrafts}
                onAdd={(draft) => skills.add(draft)}
                onUpdate={(id, partial) => skills.update(id, partial)}
                onDelete={(id) => skills.remove(id)}
                onReorder={(from, to) => skills.reorder(from, to)}
                {saving}
            />
        </div>
        <div
            class="panel"
            hidden={activeTab !== 'languages'}
            role="tabpanel"
            id="panel-languages"
            aria-labelledby="tab-languages"
            tabindex="0"
        >
            <LanguagesFrameworksSection
                drafts={visibleLanguageDrafts}
                frameworks={visibleLanguageFrameworks}
                onAddLanguage={(draft) => languages.addLanguage(draft)}
                onUpdateLanguage={(id: number, partial) => languages.updateLanguage(id, partial)}
                onRemoveLanguage={(id: number) => languages.removeLanguage(id)}
                onAddFramework={(languageId: number, draft) =>
                    languages.addFramework(languageId, draft)}
                onUpdateFramework={(id: number, partial) => languages.updateFramework(id, partial)}
                onRemoveFramework={(id: number) => languages.removeFramework(id)}
                onReorder={(from: number, to: number) => languages.reorder(from, to)}
                onReorderFrameworks={(languageId: number, from: number, to: number) =>
                    languages.reorderFrameworks(languageId, from, to)}
                onValidateLanguage={(id: number) => languages.validateLanguage(id)}
                onValidateFramework={(id: number) => languages.validateFramework(id)}
                {saving}
            />
        </div>
    {/if}
{/if}

<style>
    .header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--space-4);
        margin-top: var(--space-8);
        margin-bottom: var(--space-4);
    }

    h1 {
        margin: 0;
        font-size: 24px;
        font-weight: 700;
        color: var(--color-text);
    }

    .actions {
        display: flex;
        gap: var(--space-2);
        flex-wrap: wrap;
    }

    .muted {
        color: var(--color-muted);
        margin: var(--space-1) 0 0;
        font-size: 14px;
    }

    .stateText {
        color: var(--color-muted);
        margin: var(--space-8) 0;
        text-align: center;
    }

    .stateText.error {
        color: var(--color-danger);
    }

    .error {
        color: var(--color-danger);
        margin: 0;
    }

    .card {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-card);
        padding: var(--space-4);
    }

    .panel {
        margin-top: var(--space-2);
    }
</style>
