import { apiRequest, apiCall, ApiError } from './client';
import type {
    Education,
    EducationKeyPoint,
    NewEducationRequest,
    NewEducationKeyPointRequest,
    UpdateEducationRequest,
    UpdateEducationKeyPointRequest
} from '$lib/types';

export async function listEducations(resumeId: number): Promise<Education[]> {
    return apiCall<Education[]>(`/resume/${resumeId}/education`, { auth: true });
}

export async function createEducation(
    resumeId: number,
    payload: NewEducationRequest
): Promise<Education> {
    return apiCall<Education>(`/resume/${resumeId}/education`, {
        method: 'POST',
        body: payload,
        auth: true
    });
}

export async function updateEducation(
    educationId: number,
    payload: UpdateEducationRequest
): Promise<Education> {
    return apiCall<Education>(`/education/${educationId}`, {
        method: 'PUT',
        body: payload,
        auth: true
    });
}

export async function deleteEducation(educationId: number): Promise<void> {
    await apiRequest(`/education/${educationId}`, { method: 'DELETE', auth: true });
}

export async function listEducationKeyPoints(
    resumeId: number,
    educationId: number
): Promise<EducationKeyPoint[]> {
    return apiCall<EducationKeyPoint[]>(
        `/resume/${resumeId}/education/${educationId}/key_points`,
        { auth: true }
    );
}

export async function createEducationKeyPoint(
    resumeId: number,
    educationId: number,
    payload: NewEducationKeyPointRequest
): Promise<EducationKeyPoint> {
    return apiCall<EducationKeyPoint>(
        `/resume/${resumeId}/education/${educationId}/key_points`,
        { method: 'POST', body: payload, auth: true }
    );
}

export async function updateEducationKeyPoint(
    keyPointId: number,
    payload: UpdateEducationKeyPointRequest
): Promise<EducationKeyPoint> {
    return apiCall<EducationKeyPoint>(`/education_key_points/${keyPointId}`, {
        method: 'PUT',
        body: payload,
        auth: true
    });
}

export async function deleteEducationKeyPoint(keyPointId: number): Promise<void> {
    await apiRequest(`/education_key_points/${keyPointId}`, { method: 'DELETE', auth: true });
}
