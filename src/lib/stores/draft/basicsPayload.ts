import type { UpdateResumeRequest } from '$lib/types';
import { toNullable } from './shared';

export type BasicsPayloadDraft = {
    name: string;
    profile_image_url: string;
    location: string;
    email: string;
    github_url: string;
    video: string;
    mobile_number: string;
    executive_summary: string;
    is_public: boolean;
    is_variant: boolean;
    show_variant_tag: boolean;
    company_name: string;
    role_title: string;
    target_date: string;
    job_description: string;
    variant_label: string;
};

export function buildBasicsUpdatePayload(draft: BasicsPayloadDraft): UpdateResumeRequest {
    const payload: UpdateResumeRequest = {
        name: toNullable(draft.name),
        profile_image_url: toNullable(draft.profile_image_url),
        location: toNullable(draft.location),
        github_url: toNullable(draft.github_url),
        video: toNullable(draft.video),
        mobile_number: toNullable(draft.mobile_number),
        executive_summary: toNullable(draft.executive_summary),
        is_public: draft.is_public
    };

    if (!draft.is_variant) {
        payload.email = toNullable(draft.email);
        return payload;
    }

    payload.company_name = toNullable(draft.company_name);
    payload.role_title = toNullable(draft.role_title);
    payload.target_date = toNullable(draft.target_date);
    payload.job_description = toNullable(draft.job_description);
    payload.variant_label = toNullable(draft.variant_label);
    payload.show_variant_tag = draft.show_variant_tag;
    return payload;
}
