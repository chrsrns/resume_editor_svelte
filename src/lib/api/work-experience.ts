import { apiRequest, ApiError } from './client';
import type {
    WorkExperience,
    WorkExperienceKeyPoint,
    NewWorkExperienceRequest,
    NewWorkExperienceKeyPointRequest,
    UpdateWorkExperienceRequest,
    UpdateWorkExperienceKeyPointRequest
} from '$lib/types';

export async function listWorkExperiences(resumeId: number): Promise<WorkExperience[]> {
    const { body } = await apiRequest<WorkExperience[]>(`/resume/${resumeId}/work_experiences`, {
        auth: true
    });
    if (body === undefined) throw new ApiError(500, 'Missing response body');
    return body;
}

export async function createWorkExperience(
    resumeId: number,
    payload: NewWorkExperienceRequest
): Promise<WorkExperience> {
    const { body } = await apiRequest<WorkExperience>(`/resume/${resumeId}/work_experiences`, {
        method: 'POST',
        body: payload,
        auth: true
    });
    if (body === undefined) throw new ApiError(500, 'Missing response body');
    return body;
}

export async function updateWorkExperience(
    workId: number,
    payload: UpdateWorkExperienceRequest
): Promise<WorkExperience> {
    const { body } = await apiRequest<WorkExperience>(`/work_experiences/${workId}`, {
        method: 'PUT',
        body: payload,
        auth: true
    });
    if (body === undefined) throw new ApiError(500, 'Missing response body');
    return body;
}

export async function deleteWorkExperience(workId: number): Promise<void> {
    await apiRequest(`/work_experiences/${workId}`, { method: 'DELETE', auth: true });
}

export async function listWorkExperienceKeyPoints(
    resumeId: number,
    workId: number
): Promise<WorkExperienceKeyPoint[]> {
    const { body } = await apiRequest<WorkExperienceKeyPoint[]>(
        `/resume/${resumeId}/work_experiences/${workId}/key_points`,
        { auth: true }
    );
    if (body === undefined) throw new ApiError(500, 'Missing response body');
    return body;
}

export async function createWorkExperienceKeyPoint(
    resumeId: number,
    workId: number,
    payload: NewWorkExperienceKeyPointRequest
): Promise<WorkExperienceKeyPoint> {
    const { body } = await apiRequest<WorkExperienceKeyPoint>(
        `/resume/${resumeId}/work_experiences/${workId}/key_points`,
        { method: 'POST', body: payload, auth: true }
    );
    if (body === undefined) throw new ApiError(500, 'Missing response body');
    return body;
}

export async function updateWorkExperienceKeyPoint(
    keyPointId: number,
    payload: UpdateWorkExperienceKeyPointRequest
): Promise<WorkExperienceKeyPoint> {
    const { body } = await apiRequest<WorkExperienceKeyPoint>(
        `/work_experience_key_points/${keyPointId}`,
        {
            method: 'PUT',
            body: payload,
            auth: true
        }
    );
    if (body === undefined) throw new ApiError(500, 'Missing response body');
    return body;
}

export async function deleteWorkExperienceKeyPoint(keyPointId: number): Promise<void> {
    await apiRequest(`/work_experience_key_points/${keyPointId}`, { method: 'DELETE', auth: true });
}
