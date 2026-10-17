import { formatPartialDateLong, parsePartialDate, type Resume } from './types';

export type ResumeListEntry =
    | { kind: 'group'; base: Resume; variants: Resume[]; matchIds?: ReadonlySet<string> }
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
    if (aDate === null && bDate === null) return b.id.localeCompare(a.id);
    if (aDate === null) return 1;
    if (bDate === null) return -1;
    return bDate.localeCompare(aDate) || b.id.localeCompare(a.id);
}

export function sortVariants(variants: Resume[]): Resume[] {
    return [...variants].sort(compareVariants);
}

const SEARCH_FIELDS = [
    'name',
    'email',
    'company_name',
    'role_title',
    'variant_label',
    'job_description',
    'target_date'
] as const;

export function parseSearchTerms(query: string): string[] {
    return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

export function resumeMatches(resume: Resume, terms: string[]): boolean {
    const haystacks = SEARCH_FIELDS.map((field) => resume[field] ?? '');
    const displayDate = formatVariantTargetDate(resume.target_date);
    if (displayDate) haystacks.push(displayDate);
    const lowered = haystacks.map((text) => text.toLowerCase());
    return terms.every((term) => lowered.some((text) => text.includes(term)));
}

export function filterResumeListEntries(
    entries: ResumeListEntry[],
    terms: string[]
): ResumeListEntry[] {
    return entries.flatMap((entry): ResumeListEntry[] => {
        if (entry.kind === 'orphan') {
            return resumeMatches(entry.resume, terms) ? [entry] : [];
        }
        const matchIds = new Set(
            entry.variants.filter((variant) => resumeMatches(variant, terms)).map((v) => v.id)
        );
        if (!resumeMatches(entry.base, terms) && matchIds.size === 0) return [];
        return [{ ...entry, matchIds }];
    });
}

export const TRUNCATED_VARIANT_COUNT = 3;

export function truncateVariants(variants: Resume[], expanded: boolean): Resume[] {
    return expanded ? variants : variants.slice(0, TRUNCATED_VARIANT_COUNT);
}

export function buildResumeListEntries(resumes: Resume[]): ResumeListEntry[] {
    const variantsByBase = new Map<string, Resume[]>();
    const basesById = new Set(resumes.map((resume) => resume.id));

    for (const resume of resumes) {
        if (resume.is_variant && resume.base_resume_id !== null) {
            const variants = variantsByBase.get(resume.base_resume_id) ?? [];
            variants.push(resume);
            variantsByBase.set(resume.base_resume_id, variants);
        }
    }

    const entries: ResumeListEntry[] = [];
    for (const resume of resumes) {
        if (
            resume.is_variant &&
            resume.base_resume_id !== null &&
            basesById.has(resume.base_resume_id)
        ) {
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
