import { apiRequest, ApiError } from './client';
import type { Resume, NewResumeRequest, UpdateResumeRequest } from '$lib/types';

export async function listResumes(): Promise<Resume[]> {
    const { body } = await apiRequest<Resume[]>('/resumes', { auth: true });
    if (body === undefined) throw new ApiError(500, 'Missing response body');
    return body;
}

export async function getResume(id: number): Promise<Resume> {
    const { body } = await apiRequest<Resume>(`/resume/${id}`, { auth: true });
    if (body === undefined) throw new ApiError(500, 'Missing response body');
    return body;
}

export async function createResume(payload: NewResumeRequest): Promise<Resume> {
    const { body } = await apiRequest<Resume>('/new_resume', { method: 'POST', body: payload, auth: true });
    if (body === undefined) throw new ApiError(500, 'Missing response body');
    return body;
}

export async function updateResume(id: number, payload: UpdateResumeRequest): Promise<Resume> {
    const { body } = await apiRequest<Resume>(`/resume/${id}`, { method: 'PUT', body: payload, auth: true });
    if (body === undefined) throw new ApiError(500, 'Missing response body');
    return body;
}

export async function deleteResume(id: number): Promise<void> {
    await apiRequest(`/resume/${id}`, { method: 'DELETE', auth: true });
}
