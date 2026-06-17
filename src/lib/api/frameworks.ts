import { apiRequest, ApiError } from './client';
import type { Framework, NewFrameworkRequest, UpdateFrameworkRequest } from '$lib/types';

export async function listFrameworks(resumeId: number, languageId: number): Promise<Framework[]> {
    const { body } = await apiRequest<Framework[]>(
        `/resume/${resumeId}/languages/${languageId}/frameworks`,
        {
            auth: true
        }
    );
    if (body === undefined) throw new ApiError(500, 'Missing response body');
    return body;
}

export async function createFramework(
    resumeId: number,
    languageId: number,
    payload: NewFrameworkRequest
): Promise<Framework> {
    const { body } = await apiRequest<Framework>(
        `/resume/${resumeId}/languages/${languageId}/frameworks`,
        {
            method: 'POST',
            body: payload,
            auth: true
        }
    );
    if (body === undefined) throw new ApiError(500, 'Missing response body');
    return body;
}

export async function updateFramework(
    frameworkId: number,
    payload: UpdateFrameworkRequest
): Promise<Framework> {
    const { body } = await apiRequest<Framework>(`/frameworks/${frameworkId}`, {
        method: 'PUT',
        body: payload,
        auth: true
    });
    if (body === undefined) throw new ApiError(500, 'Missing response body');
    return body;
}

export async function deleteFramework(frameworkId: number): Promise<void> {
    await apiRequest(`/frameworks/${frameworkId}`, { method: 'DELETE', auth: true });
}
