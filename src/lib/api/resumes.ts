import { apiRequest, apiCall, apiRawRequest, apiErrorMessage, ApiError } from './client';
import type { Resume, NewResumeRequest, NewVariantRequest, UpdateResumeRequest } from '$lib/types';

export async function listResumes(): Promise<Resume[]> {
    return apiCall<Resume[]>('/resumes', { auth: true });
}

export async function getResume(id: string): Promise<Resume> {
    return apiCall<Resume>(`/resume/${id}`, { auth: true });
}

export async function createResume(payload: NewResumeRequest): Promise<Resume> {
    return apiCall<Resume>('/new_resume', {
        method: 'POST',
        body: payload,
        auth: true
    });
}

export async function updateResume(id: string, payload: UpdateResumeRequest): Promise<Resume> {
    return apiCall<Resume>(`/resume/${id}`, {
        method: 'PUT',
        body: payload,
        auth: true
    });
}

export async function deleteResume(id: string): Promise<void> {
    await apiRequest(`/resume/${id}`, { method: 'DELETE', auth: true });
}

export async function createVariant(id: string, payload: NewVariantRequest): Promise<Resume> {
    return apiCall<Resume>(`/resume/${id}/variants`, {
        method: 'POST',
        body: payload,
        auth: true
    });
}

export async function listVariants(id: string): Promise<Resume[]> {
    return apiCall<Resume[]>(`/resume/${id}/variants`, { auth: true });
}

export async function exportResumeMarkdown(id: string): Promise<Blob> {
    const { res, text, parsed } = await apiRawRequest(`/resume/${id}/export/markdown`, {
        auth: true
    });

    if (!res.ok) {
        throw new ApiError(res.status, apiErrorMessage(parsed, 'Export failed'));
    }

    return new Blob([text], { type: 'text/markdown' });
}

export async function importResumeMarkdown(markdown: string): Promise<Resume> {
    const { res, text, parsed } = await apiRawRequest('/resume/import/markdown', {
        method: 'POST',
        contentType: 'text/markdown',
        rawBody: markdown,
        auth: true
    });

    if (parsed === undefined) {
        throw new ApiError(res.status, 'Failed to parse response', text);
    }
    if (!res.ok) {
        throw new ApiError(res.status, apiErrorMessage(parsed, 'Import failed'));
    }
    if (parsed.body === undefined) throw new ApiError(500, 'Missing response body');
    return parsed.body as Resume;
}

export async function importResumeMarkdownInto(id: string, markdown: string): Promise<Resume> {
    const { res, text, parsed } = await apiRawRequest(`/resume/${id}/import/markdown`, {
        method: 'POST',
        contentType: 'text/markdown',
        rawBody: markdown,
        auth: true
    });

    if (parsed === undefined) {
        throw new ApiError(res.status, 'Failed to parse response', text);
    }
    if (!res.ok) {
        throw new ApiError(res.status, apiErrorMessage(parsed, 'Import failed'));
    }
    if (parsed.body === undefined) throw new ApiError(500, 'Missing response body');
    return parsed.body as Resume;
}
