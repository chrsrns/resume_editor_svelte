import { apiRequest, unwrapBody, ApiError } from './client';
import type { Resume, NewResumeRequest, UpdateResumeRequest } from '$lib/types';

export async function listResumes(): Promise<Resume[]> {
    const { body } = await apiRequest('/resumes', { auth: true });
    if (!body) throw new ApiError(500, 'Missing response body');
    return unwrapBody(body, 'Resumes');
}

export async function getResume(id: number): Promise<Resume> {
    const { body } = await apiRequest(`/resume/${id}`, { auth: true });
    if (!body) throw new ApiError(500, 'Missing response body');
    return unwrapBody(body, 'Resume');
}

export async function createResume(payload: NewResumeRequest): Promise<Resume> {
    const { body } = await apiRequest('/new_resume', { method: 'POST', body: payload, auth: true });
    if (!body) throw new ApiError(500, 'Missing response body');
    return unwrapBody(body, 'Resume');
}

export async function updateResume(id: number, payload: UpdateResumeRequest): Promise<Resume> {
    const { body } = await apiRequest(`/resume/${id}`, { method: 'PUT', body: payload, auth: true });
    if (!body) throw new ApiError(500, 'Missing response body');
    return unwrapBody(body, 'Resume');
}

export async function deleteResume(id: number): Promise<void> {
    await apiRequest(`/resume/${id}`, { method: 'DELETE', auth: true });
}
