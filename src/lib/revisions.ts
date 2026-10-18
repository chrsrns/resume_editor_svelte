import { byDisplayOrder } from '$lib/displayOrder';
import type {
    ResumeSnapshot,
    SnapshotEducation,
    SnapshotEducationKeyPoint,
    SnapshotFramework,
    SnapshotLanguage,
    SnapshotPortfolioKeyPoint,
    SnapshotPortfolioProject,
    SnapshotPortfolioTechnology,
    SnapshotSkill,
    SnapshotWorkExperience,
    SnapshotWorkExperienceKeyPoint
} from '$lib/types';

export type RevisionSelection =
    | { kind: 'closed' }
    | { kind: 'invalid' }
    | { kind: 'selected'; n: number };

const REVISION_PARAM_PATTERN = /^[1-9][0-9]*$/;
const REVISION_PARAM_MAX = 2147483647;

export function parseRevisionParam(raw: string | null): RevisionSelection {
    if (raw === null) return { kind: 'closed' };
    if (!REVISION_PARAM_PATTERN.test(raw)) return { kind: 'invalid' };
    const n = Number(raw);
    if (!Number.isSafeInteger(n) || n > REVISION_PARAM_MAX) return { kind: 'invalid' };
    return { kind: 'selected', n };
}

const ACTION_LABELS: Record<string, string> = {
    personalinfo: 'Personal info',
    education: 'Education',
    experience: 'Work experience',
    projects: 'Projects',
    skills: 'Skills',
    languages: 'Languages',
    frameworks: 'Frameworks'
};

export function revisionActionLabel(action: string): string {
    return ACTION_LABELS[action] ?? action;
}

/**
 * The backend serializes NaiveDateTime without an offset; treat such values as
 * UTC rather than letting `new Date` read them as local time.
 */
export function revisionTimestampToDate(createdAt: string): Date {
    const hasOffset = /(Z|[+-]\d{2}:?\d{2})$/i.test(createdAt.trim());
    return new Date(hasOffset ? createdAt : `${createdAt.trim().replace(' ', 'T')}Z`);
}

export function formatRevisionTimestamp(createdAt: string): string {
    return revisionTimestampToDate(createdAt).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

export function formatChangeValue(value: unknown): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

export type SnapshotEducationEntry = {
    education: SnapshotEducation;
    keyPoints: SnapshotEducationKeyPoint[];
};

export type SnapshotWorkEntry = {
    experience: SnapshotWorkExperience;
    keyPoints: SnapshotWorkExperienceKeyPoint[];
};

export type SnapshotProjectEntry = {
    project: SnapshotPortfolioProject;
    keyPoints: SnapshotPortfolioKeyPoint[];
    technologies: SnapshotPortfolioTechnology[];
};

export type SnapshotLanguageEntry = {
    language: SnapshotLanguage;
    frameworks: SnapshotFramework[];
};

export type SnapshotSections = {
    educations: SnapshotEducationEntry[];
    skills: SnapshotSkill[];
    workExperiences: SnapshotWorkEntry[];
    portfolioProjects: SnapshotProjectEntry[];
    languages: SnapshotLanguageEntry[];
};

/**
 * Rows carry display_order when the collection is ordered; when every row in
 * a collection lacks it the backend wire order (row id order) is preserved.
 */
function sortSnapshotRows<T extends { id: number; display_order: number | null }>(rows: T[]): T[] {
    if (rows.every((row) => row.display_order === null || row.display_order === undefined)) {
        return [...rows];
    }
    return [...rows].sort(byDisplayOrder);
}

function keyedChildren<T extends { id: number; display_order: number | null }>(
    map: Record<string, T[]> | undefined,
    parentId: number
): T[] {
    return sortSnapshotRows(map?.[String(parentId)] ?? []);
}

export function snapshotToSections(snapshot: ResumeSnapshot): SnapshotSections {
    return {
        educations: sortSnapshotRows(snapshot.education ?? []).map((education) => ({
            education,
            keyPoints: keyedChildren(snapshot.education_key_points, education.id)
        })),
        skills: sortSnapshotRows(snapshot.skills ?? []),
        workExperiences: sortSnapshotRows(snapshot.work_experiences ?? []).map((experience) => ({
            experience,
            keyPoints: keyedChildren(snapshot.work_experience_key_points, experience.id)
        })),
        portfolioProjects: sortSnapshotRows(snapshot.portfolio_projects ?? []).map((project) => ({
            project,
            keyPoints: keyedChildren(snapshot.portfolio_key_points, project.id),
            technologies: keyedChildren(snapshot.portfolio_technologies, project.id)
        })),
        languages: sortSnapshotRows(snapshot.languages ?? []).map((language) => ({
            language,
            frameworks: keyedChildren(snapshot.frameworks, language.id)
        }))
    };
}
