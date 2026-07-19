export type ApiResponse<T> = {
    body: T;
};

export type AuthTokenResponse = {
    token: string;
    expires_at: string;
};

export type User = {
    id: number;
    email: string;
    created_at: string;
    updated_at: string;
};

export type Resume = {
    id: number;
    name: string;
    profile_image_url: string | null;
    location: string | null;
    email: string;
    github_url: string | null;
    mobile_number: string | null;
    executive_summary: string | null;
    created_at: string;
    updated_at: string;
    created_by: number | null;
    is_public: boolean;
};

export type AuthRegisterRequest = {
    email: string;
    password: string;
};

export type AuthLoginRequest = {
    email: string;
    password: string;
};

export type NewResumeRequest = {
    name: string;
    profile_image_url?: string | null;
    location?: string | null;
    email: string;
    github_url?: string | null;
    mobile_number?: string | null;
    executive_summary?: string | null;
    is_public?: boolean | null;
};

export type UpdateResumeRequest = {
    name?: string | null;
    profile_image_url?: string | null;
    location?: string | null;
    email?: string | null;
    github_url?: string | null;
    mobile_number?: string | null;
    executive_summary?: string | null;
    is_public?: boolean | null;
};

export type Skill = {
    id: number;
    resume_id: number;
    skill_name: string;
    confidence_percentage: number;
    display_order: number | null;
    created_at: string;
};

export type NewSkillRequest = {
    skill_name: string;
    confidence_percentage: number;
    display_order?: number | null;
};

export type UpdateSkillRequest = {
    skill_name?: string | null;
    confidence_percentage?: number | null;
    display_order?: number | null;
};

export type Language = {
    id: number;
    resume_id: number;
    language_name: string;
    display_order: number | null;
    created_at: string;
};

export type NewLanguageRequest = {
    language_name: string;
    display_order?: number | null;
};

export type UpdateLanguageRequest = {
    language_name?: string | null;
    display_order?: number | null;
};

export type Framework = {
    id: number;
    language_id: number;
    framework_name: string;
    display_order: number | null;
    created_at: string;
};

export type NewFrameworkRequest = {
    framework_name: string;
    display_order?: number | null;
};

export type UpdateFrameworkRequest = {
    framework_name?: string | null;
    display_order?: number | null;
};

export type Education = {
    id: number;
    resume_id: number;
    education_stage: string;
    institution_name: string;
    degree: string | null;
    start_date: string;
    end_date: string | null;
    description: string | null;
    display_order: number | null;
    active: boolean;
    created_at: string;
};

export type NewEducationRequest = {
    education_stage: string;
    institution_name: string;
    degree?: string | null;
    start_date: string;
    end_date?: string | null;
    description?: string | null;
    display_order?: number | null;
    active?: boolean;
};

export type UpdateEducationRequest = {
    education_stage?: string | null;
    institution_name?: string | null;
    degree?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    description?: string | null;
    display_order?: number | null;
    active?: boolean;
};

export type EducationKeyPoint = {
    id: number;
    education_id: number;
    key_point: string;
    display_order: number | null;
    created_at: string;
};

export type NewEducationKeyPointRequest = {
    key_point: string;
    display_order?: number | null;
};

export type UpdateEducationKeyPointRequest = {
    key_point?: string | null;
    display_order?: number | null;
};

export type WorkExperience = {
    id: number;
    resume_id: number;
    job_title: string;
    company_name: string | null;
    start_date: string;
    end_date: string | null;
    description: string | null;
    display_order: number | null;
    active: boolean;
    created_at: string;
};

export type NewWorkExperienceRequest = {
    job_title: string;
    company_name?: string | null;
    start_date: string;
    end_date?: string | null;
    description?: string | null;
    display_order?: number | null;
    active?: boolean;
};

export type UpdateWorkExperienceRequest = {
    job_title?: string | null;
    company_name?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    description?: string | null;
    display_order?: number | null;
    active?: boolean;
};

export type WorkExperienceKeyPoint = {
    id: number;
    work_experience_id: number;
    key_point: string;
    display_order: number | null;
    active: boolean;
    created_at: string;
};

export type NewWorkExperienceKeyPointRequest = {
    key_point: string;
    display_order?: number | null;
};

export type UpdateWorkExperienceKeyPointRequest = {
    key_point?: string | null;
    display_order?: number | null;
    active?: boolean;
};

export type PortfolioProject = {
    id: number;
    resume_id: number;
    project_name: string;
    image_url: string | null;
    project_link: string | null;
    source_code_link: string | null;
    description: string | null;
    display_order: number | null;
    active: boolean;
    created_at: string;
};

export type NewPortfolioProjectRequest = {
    project_name: string;
    image_url?: string | null;
    project_link?: string | null;
    source_code_link?: string | null;
    description?: string | null;
    display_order?: number | null;
    active?: boolean;
};

export type UpdatePortfolioProjectRequest = {
    project_name?: string | null;
    image_url?: string | null;
    project_link?: string | null;
    source_code_link?: string | null;
    description?: string | null;
    display_order?: number | null;
    active?: boolean;
};

export type PortfolioKeyPoint = {
    id: number;
    portfolio_project_id: number;
    key_point: string;
    display_order: number | null;
    created_at: string;
};

export type NewPortfolioKeyPointRequest = {
    key_point: string;
    display_order?: number | null;
};

export type UpdatePortfolioKeyPointRequest = {
    key_point?: string | null;
    display_order?: number | null;
};

export type PortfolioTechnology = {
    id: number;
    portfolio_project_id: number;
    technology_name: string;
    display_order: number | null;
    created_at: string;
};

export type NewPortfolioTechnologyRequest = {
    technology_name: string;
    display_order?: number | null;
};

export type UpdatePortfolioTechnologyRequest = {
    technology_name?: string | null;
    display_order?: number | null;
};

export type PartialDate = {
    year: string;
    month: string;
    day: string;
};

export function parsePartialDate(iso: string): PartialDate {
    if (!iso) return { year: '', month: '', day: '' };
    const parts = iso.split('-');
    const year = parts[0] ?? '';
    const month = parts[1] ? String(Number(parts[1])) : '';
    const day = parts[2] ? String(Number(parts[2])) : '';
    return { year, month, day };
}

export function formatPartialDate(date: PartialDate): string {
    if (!date.year) return '';
    const month = date.month ? String(Number(date.month)).padStart(2, '0') : '';
    const day = date.day ? String(Number(date.day)).padStart(2, '0') : '';
    if (!month) return date.year;
    if (!day) return `${date.year}-${month}`;
    return `${date.year}-${month}-${day}`;
}

export function getPartialDatePrecision(date: PartialDate): 'year' | 'month' | 'day' | null {
    if (!date.year) return null;
    if (!date.month) return 'year';
    if (!date.day) return 'month';
    return 'day';
}

function isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function getDaysInMonth(year: string, month: string): number {
    const y = Number(year);
    const m = Number(month);
    if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return 31;
    const days = [31, isLeapYear(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return days[m - 1];
}

export function validatePartialDate(date: PartialDate): string | null {
    if (!date.year) return 'Year is required';
    const year = Number(date.year);
    if (!Number.isFinite(year)) return 'Year is invalid';
    if (date.day && !date.month) return 'Month is required when day is selected';
    if (date.month) {
        const month = Number(date.month);
        if (!Number.isFinite(month) || month < 1 || month > 12) return 'Month is invalid';
        if (date.day) {
            const day = Number(date.day);
            const maxDay = getDaysInMonth(date.year, date.month);
            if (!Number.isFinite(day) || day < 1 || day > maxDay) return 'Day is invalid';
        }
    }
    return null;
}

export function isPartialDateRangeValid(start: string, end: string | null): boolean {
    if (!end || !end.trim()) return true;
    if (!start) return false;

    function canonicalRange(iso: string, endOfPeriod: boolean): { year: number; month: number; day: number } {
        const parts = iso.split('-').map((p) => Number(p));
        const year = Number(parts[0]);
        const month = Number(parts[1] ?? (endOfPeriod ? 12 : 1));
        let day: number;
        if (parts[2] !== undefined && !Number.isNaN(parts[2])) {
            day = parts[2];
        } else if (endOfPeriod && parts[1] !== undefined && !Number.isNaN(parts[1])) {
            day = getDaysInMonth(String(year), String(month));
        } else if (endOfPeriod) {
            day = 31;
        } else {
            day = 1;
        }
        return { year, month, day };
    }

    const startCanonical = canonicalRange(start, false);
    const endCanonical = canonicalRange(end, true);

    const startDate = new Date(startCanonical.year, startCanonical.month - 1, startCanonical.day);
    const endDate = new Date(endCanonical.year, endCanonical.month - 1, endCanonical.day);
    return endDate.getTime() >= startDate.getTime();
}
