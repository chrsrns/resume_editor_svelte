export type ApiResponse = {
    body: ApiResponseBody;
};

export type ApiResponseBody =
    | { Message: string }
    | { Resume: Resume }
    | { Resumes: Resume[] }
    | { User: User }
    | { AuthToken: AuthTokenResponse };

export type ApiResponseBodyKey = keyof ({
    Message: string;
    Resume: Resume;
    Resumes: Resume[];
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
