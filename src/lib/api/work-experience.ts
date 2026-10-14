import { apiRequest, apiCall, ApiError } from './client';
import type {
    WorkExperience,
    WorkExperienceKeyPoint,
    NewWorkExperienceRequest,
    NewWorkExperienceKeyPointRequest,
    UpdateWorkExperienceRequest,
    UpdateWorkExperienceKeyPointRequest
} from '$lib/types';

export async function listWorkExperiences(resumeId: number): Promise<WorkExperience[]> {
    return apiCall<WorkExperience[]>(`/resume/${resumeId}/work_experiences`, {
        auth: true
    });
}

export async function createWorkExperience(
    resumeId: number,
    payload: NewWorkExperienceRequest
): Promise<WorkExperience> {
    return apiCall<WorkExperience>(`/resume/${resumeId}/work_experiences`, {
        method: 'POST',
        body: payload,
        auth: true
    });
}

export async function updateWorkExperience(
    workId: number,
    payload: UpdateWorkExperienceRequest
): Promise<WorkExperience> {
    return apiCall<WorkExperience>(`/work_experiences/${workId}`, {
        method: 'PUT',
        body: payload,
        auth: true
    });
}

export async function deleteWorkExperience(workId: number): Promise<void> {
    await apiRequest(`/work_experiences/${workId}`, { method: 'DELETE', auth: true });
}

export async function listWorkExperienceKeyPoints(
    resumeId: number,
    workId: number
): Promise<WorkExperienceKeyPoint[]> {
    return apiCall<WorkExperienceKeyPoint[]>(
        `/resume/${resumeId}/work_experiences/${workId}/key_points`,
        { auth: true }
    );
}

export async function createWorkExperienceKeyPoint(
    resumeId: number,
    workId: number,
    payload: NewWorkExperienceKeyPointRequest
): Promise<WorkExperienceKeyPoint> {
    return apiCall<WorkExperienceKeyPoint>(
        `/resume/${resumeId}/work_experiences/${workId}/key_points`,
        { method: 'POST', body: payload, auth: true }
    );
}

export async function updateWorkExperienceKeyPoint(
    keyPointId: number,
    payload: UpdateWorkExperienceKeyPointRequest
): Promise<WorkExperienceKeyPoint> {
    return apiCall<WorkExperienceKeyPoint>(
        `/work_experience_key_points/${keyPointId}`,
        {
            method: 'PUT',
            body: payload,
            auth: true
        }
    );
}

export async function deleteWorkExperienceKeyPoint(keyPointId: number): Promise<void> {
    await apiRequest(`/work_experience_key_points/${keyPointId}`, { method: 'DELETE', auth: true });
}
