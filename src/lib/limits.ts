/**
 * Field-length limits declared once for UI maxlength, form validation,
 * and store validation.
 */
export const FIELD_LIMITS = {
    company_name: 255,
    role_title: 255,
    variant_label: 255,
    video_url: 500,
    executive_summary: 5000,
    job_description: 20000
} as const;

/** Returns an error string when the trimmed value exceeds the limit. */
export function checkMaxLen(label: string, value: string, max: number): string | null {
    return value.trim().length > max
        ? `${label} must be ${max.toLocaleString('en-US')} characters or less`
        : null;
}
