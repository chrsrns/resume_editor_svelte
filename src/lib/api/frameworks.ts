import { apiRequest, apiCall, ApiError } from './client';
import type { Framework, NewFrameworkRequest, UpdateFrameworkRequest } from '$lib/types';

export async function listFrameworks(resumeId: string, languageId: number): Promise<Framework[]> {
    return apiCall<Framework[]>(
        `/resume/${resumeId}/languages/${languageId}/frameworks`,
        {
            auth: true
        }
    );
}

export async function createFramework(
    resumeId: string,
    languageId: number,
    payload: NewFrameworkRequest
): Promise<Framework> {
    return apiCall<Framework>(
        `/resume/${resumeId}/languages/${languageId}/frameworks`,
        {
            method: 'POST',
            body: payload,
            auth: true
        }
    );
}

export async function updateFramework(
    frameworkId: number,
    payload: UpdateFrameworkRequest
): Promise<Framework> {
    return apiCall<Framework>(`/frameworks/${frameworkId}`, {
        method: 'PUT',
        body: payload,
        auth: true
    });
}

export async function deleteFramework(frameworkId: number): Promise<void> {
    await apiRequest(`/frameworks/${frameworkId}`, { method: 'DELETE', auth: true });
}
