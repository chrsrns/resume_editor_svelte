export type ApiResponse = {
    body: ApiResponseBody;
};

export type ApiResponseBody =
    | { Message: string }
    | { Resume: Resume }
    | { Resumes: Resume[] }
    | { Skill: Skill }
    | { Skills: Skill[] }
    | { Language: Language }
    | { Languages: Language[] }
    | { Framework: Framework }
    | { Frameworks: Framework[] }
    | { Education: Education }
    | { Educations: Education[] }
    | { EducationKeyPoint: EducationKeyPoint }
    | { EducationKeyPoints: EducationKeyPoint[] }
    | { WorkExperience: WorkExperience }
    | { WorkExperiences: WorkExperience[] }
    | { WorkExperienceKeyPoint: WorkExperienceKeyPoint }
    | { WorkExperienceKeyPoints: WorkExperienceKeyPoint[] }
    | { PortfolioProject: PortfolioProject }
    | { PortfolioProjects: PortfolioProject[] }
    | { PortfolioKeyPoint: PortfolioKeyPoint }
    | { PortfolioKeyPoints: PortfolioKeyPoint[] }
    | { PortfolioTechnology: PortfolioTechnology }
    | { PortfolioTechnologies: PortfolioTechnology[] }
    | { User: User }
    | { AuthToken: AuthTokenResponse };

export type ApiResponseBodyKey = keyof ({
    Message: string;
    Resume: Resume;
    Resumes: Resume[];
    Skill: Skill;
    Skills: Skill[];
    Language: Language;
    Languages: Language[];
    Framework: Framework;
    Frameworks: Framework[];
    Education: Education;
    Educations: Education[];
    EducationKeyPoint: EducationKeyPoint;
    EducationKeyPoints: EducationKeyPoint[];
    WorkExperience: WorkExperience;
    WorkExperiences: WorkExperience[];
    WorkExperienceKeyPoint: WorkExperienceKeyPoint;
    WorkExperienceKeyPoints: WorkExperienceKeyPoint[];
    PortfolioProject: PortfolioProject;
    PortfolioProjects: PortfolioProject[];
    PortfolioKeyPoint: PortfolioKeyPoint;
    PortfolioKeyPoints: PortfolioKeyPoint[];
    PortfolioTechnology: PortfolioTechnology;
    PortfolioTechnologies: PortfolioTechnology[];
    User: User;
    AuthToken: AuthTokenResponse;
});

export type ApiResponseBodyValue<K extends ApiResponseBodyKey> = Extract<
    ApiResponseBody,
    Record<K, unknown>
>[K];

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
    is_public?: boolean | null;
};

export type UpdateResumeRequest = {
    name?: string | null;
    profile_image_url?: string | null;
    location?: string | null;
    email?: string | null;
    github_url?: string | null;
    mobile_number?: string | null;
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
};

export type UpdateEducationRequest = {
    education_stage?: string | null;
    institution_name?: string | null;
    degree?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    description?: string | null;
    display_order?: number | null;
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
    created_at: string;
};

export type NewWorkExperienceRequest = {
    job_title: string;
    company_name?: string | null;
    start_date: string;
    end_date?: string | null;
    description?: string | null;
    display_order?: number | null;
};

export type UpdateWorkExperienceRequest = {
    job_title?: string | null;
    company_name?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    description?: string | null;
    display_order?: number | null;
};

export type WorkExperienceKeyPoint = {
    id: number;
    work_experience_id: number;
    key_point: string;
    display_order: number | null;
    created_at: string;
};

export type NewWorkExperienceKeyPointRequest = {
    key_point: string;
    display_order?: number | null;
};

export type UpdateWorkExperienceKeyPointRequest = {
    key_point?: string | null;
    display_order?: number | null;
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
    created_at: string;
};

export type NewPortfolioProjectRequest = {
    project_name: string;
    image_url?: string | null;
    project_link?: string | null;
    source_code_link?: string | null;
    description?: string | null;
    display_order?: number | null;
};

export type UpdatePortfolioProjectRequest = {
    project_name?: string | null;
    image_url?: string | null;
    project_link?: string | null;
    source_code_link?: string | null;
    description?: string | null;
    display_order?: number | null;
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
