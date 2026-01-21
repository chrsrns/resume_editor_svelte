import { apiRequest, unwrapBody, ApiError } from './client';
import type {
    Education,
    EducationKeyPoint,
    NewEducationRequest,
    NewEducationKeyPointRequest,
    UpdateEducationRequest,
    UpdateEducationKeyPointRequest
} from '$lib/types';

export async function listEducations(resumeId: number): Promise<Education[]> {
    const { body } = await apiRequest(`/resume/${resumeId}/education`, { auth: true });
    if (!body) throw new ApiError(500, 'Missing response body');
    return unwrapBody(body, 'Educations');
}

export async function createEducation(
    resumeId: number,
    payload: NewEducationRequest
): Promise<Education> {
    const { body } = await apiRequest(`/resume/${resumeId}/education`, {
        method: 'POST',
        body: payload,
        auth: true
    });
    if (!body) throw new ApiError(500, 'Missing response body');
    return unwrapBody(body, 'Education');
}

export async function updateEducation(
    educationId: number,
    payload: UpdateEducationRequest
): Promise<Education> {
    const { body } = await apiRequest(`/education/${educationId}`, {
        method: 'PUT',
        body: payload,
        auth: true
    });
    if (!body) throw new ApiError(500, 'Missing response body');
    return unwrapBody(body, 'Education');
}

export async function deleteEducation(educationId: number): Promise<void> {
    await apiRequest(`/education/${educationId}`, { method: 'DELETE', auth: true });
}

export async function listEducationKeyPoints(
    resumeId: number,
    educationId: number
): Promise<EducationKeyPoint[]> {
    const { body } = await apiRequest(
        `/resume/${resumeId}/education/${educationId}/key_points`,
        { auth: true }
    );
    if (!body) throw new ApiError(500, 'Missing response body');
    return unwrapBody(body, 'EducationKeyPoints');
}

export async function createEducationKeyPoint(
    resumeId: number,
    educationId: number,
    payload: NewEducationKeyPointRequest
): Promise<EducationKeyPoint> {
    const { body } = await apiRequest(
        `/resume/${resumeId}/education/${educationId}/key_points`,
        { method: 'POST', body: payload, auth: true }
    );
    if (!body) throw new ApiError(500, 'Missing response body');
    return unwrapBody(body, 'EducationKeyPoint');
}

export async function updateEducationKeyPoint(
    keyPointId: number,
    payload: UpdateEducationKeyPointRequest
): Promise<EducationKeyPoint> {
    const { body } = await apiRequest(`/education_key_points/${keyPointId}`, {
        method: 'PUT',
        body: payload,
        auth: true
    });
    if (!body) throw new ApiError(500, 'Missing response body');
    return unwrapBody(body, 'EducationKeyPoint');
}

export async function deleteEducationKeyPoint(keyPointId: number): Promise<void> {
    await apiRequest(`/education_key_points/${keyPointId}`, { method: 'DELETE', auth: true });
}
