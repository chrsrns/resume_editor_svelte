import { formatPartialDateLong, parsePartialDate, type Resume, type ResumePage } from './types';

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

/**
 * Maps a server-decided grouped page to list entries. A unit whose own
 * row is a standalone variant renders as an orphan; a non-variant unit
 * renders as a group. `matchIds` marks which variants matched the
 * rendered search terms for dimming — the server already decided group
 * membership, so entries are never filtered out here.
 */
export function mapResumePageEntries(page: ResumePage, terms: string[]): ResumeListEntry[] {
    return page.items.map((unit): ResumeListEntry => {
        if (unit.base.is_variant) {
            return { kind: 'orphan', resume: unit.base };
        }
        const variants = sortVariants(unit.variants);
        const matchIds =
            terms.length === 0
                ? undefined
                : new Set(variants.filter((v) => resumeMatches(v, terms)).map((v) => v.id));
        return { kind: 'group', base: unit.base, variants, matchIds };
    });
}

export const TRUNCATED_VARIANT_COUNT = 3;

export function truncateVariants(variants: Resume[], expanded: boolean): Resume[] {
    return expanded ? variants : variants.slice(0, TRUNCATED_VARIANT_COUNT);
}


