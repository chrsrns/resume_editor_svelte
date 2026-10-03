import { formatPartialDateLong, parsePartialDate, type Resume } from './types';

export type ResumeListEntry =
    | { kind: 'group'; base: Resume; variants: Resume[] }
    | { kind: 'orphan'; resume: Resume };

export function variantPrimaryText(resume: Resume): string {
    return resume.company_name ?? resume.variant_label ?? resume.name;
}

export function formatVariantTargetDate(targetDate: string | null): string | null {
    if (!targetDate) return null;
    const parsed = parsePartialDate(targetDate);
    return parsed ? formatPartialDateLong(parsed) : targetDate;
}

function targetDateSortKey(targetDate: string | null): string | null {
    if (!targetDate) return null;
    if (/^\d{4}$/.test(targetDate)) return `${targetDate}-01-01`;
    if (/^\d{4}-\d{2}$/.test(targetDate)) return `${targetDate}-01`;
    return targetDate;
}

export function compareVariants(a: Resume, b: Resume): number {
    const aDate = targetDateSortKey(a.target_date);
    const bDate = targetDateSortKey(b.target_date);
    if (aDate === null && bDate === null) return b.id - a.id;
    if (aDate === null) return 1;
    if (bDate === null) return -1;
    return bDate.localeCompare(aDate) || b.id - a.id;
}

export function sortVariants(variants: Resume[]): Resume[] {
    return [...variants].sort(compareVariants);
}

export function buildResumeListEntries(resumes: Resume[]): ResumeListEntry[] {
    const variantsByBase = new Map<number, Resume[]>();
    const basesById = new Set(resumes.map((resume) => resume.id));

    for (const resume of resumes) {
        if (resume.base_resume_id !== null) {
            const variants = variantsByBase.get(resume.base_resume_id) ?? [];
            variants.push(resume);
            variantsByBase.set(resume.base_resume_id, variants);
        }
    }

    const entries: ResumeListEntry[] = [];
    for (const resume of resumes) {
        if (resume.base_resume_id !== null && basesById.has(resume.base_resume_id)) {
            continue;
        }
        if (resume.is_variant) {
            entries.push({ kind: 'orphan', resume });
        } else {
            entries.push({
                kind: 'group',
                base: resume,
                variants: sortVariants(variantsByBase.get(resume.id) ?? [])
            });
        }
    }
    return entries;
}
