import { get } from 'svelte/store';
import { apiRequest, ApiError, getApiBaseUrl } from './client';
import { authToken } from '$lib/auth';
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
    const { body } = await apiRequest<Resume>('/new_resume', {
        method: 'POST',
        body: payload,
        auth: true
    });
    if (body === undefined) throw new ApiError(500, 'Missing response body');
    return body;
}

export async function updateResume(id: number, payload: UpdateResumeRequest): Promise<Resume> {
    const { body } = await apiRequest<Resume>(`/resume/${id}`, {
        method: 'PUT',
        body: payload,
        auth: true
    });
    if (body === undefined) throw new ApiError(500, 'Missing response body');
    return body;
}

export async function deleteResume(id: number): Promise<void> {
    await apiRequest(`/resume/${id}`, { method: 'DELETE', auth: true });
}

export async function exportResumeMarkdown(id: number): Promise<Blob> {
    const url = `${getApiBaseUrl()}/resume/${id}/export/markdown`;
    const token = get(authToken);

    const headers: Record<string, string> = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url, { method: 'GET', headers });

    if (!res.ok) {
        const text = await res.text();
        let message = 'Export failed';
        try {
            const parsed = JSON.parse(text) as { body?: string };
            if (typeof parsed.body === 'string') message = parsed.body;
        } catch {
            // non-JSON response; use fallback message
        }
        throw new ApiError(res.status, message);
    }

    return res.blob();
}

export async function importResumeMarkdown(markdown: string): Promise<Resume> {
    const url = `${getApiBaseUrl()}/resume/import/markdown`;
    const token = get(authToken);

    const headers: Record<string, string> = {
        'Content-Type': 'text/markdown'
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url, { method: 'POST', headers, body: markdown });

    const text = await res.text();
    let parsed: { body?: unknown };
    try {
        parsed = JSON.parse(text) as { body?: unknown };
    } catch {
        throw new ApiError(res.status, 'Failed to parse response', text);
    }

    if (!res.ok) {
        const message = typeof parsed.body === 'string' ? parsed.body : 'Import failed';
        throw new ApiError(res.status, message);
    }

    if (parsed.body === undefined) throw new ApiError(500, 'Missing response body');
    return parsed.body as Resume;
}
