import { apiRequest, apiCall, apiRawRequest, ApiError } from './client';
import type {
    Resume,
    NewResumeRequest,
    NewVariantRequest,
    UpdateResumeRequest,
    ResumeRevision,
    ResumeRevisionSummary,
    ResumeRevisionDiff
} from '$lib/types';

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

export async function listRevisions(id: string): Promise<ResumeRevisionSummary[]> {
    return apiCall<ResumeRevisionSummary[]>(`/resume/${id}/revisions`, { auth: true });
}

export async function getRevision(id: string, n: number): Promise<ResumeRevision> {
    return apiCall<ResumeRevision>(`/resume/${id}/revisions/${n}`, { auth: true });
}

export async function getRevisionDiff(
    id: string,
    n: number,
    unified = false
): Promise<ResumeRevisionDiff> {
    const path = `/resume/${id}/revisions/${n}/diff${unified ? '?unified=true' : ''}`;
    return apiCall<ResumeRevisionDiff>(path, { auth: true });
}

export async function restoreRevision(
    id: string,
    n: number,
    expectedRevision: number
): Promise<Resume> {
    return apiCall<Resume>(`/resume/${id}/revisions/${n}/restore`, {
        method: 'POST',
        body: { expected_revision: expectedRevision },
        auth: true
    });
}

export async function exportResumeMarkdown(id: string): Promise<Blob> {
    const { res, text, parsed } = await apiRawRequest(`/resume/${id}/export/markdown`, {
        auth: true
    });

    if (!res.ok) {
        throw new ApiError(res.status, ApiError.messageFrom(parsed, 'Export failed'));
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
        throw new ApiError(res.status, ApiError.messageFrom(parsed, 'Import failed'));
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
        throw new ApiError(res.status, ApiError.messageFrom(parsed, 'Import failed'));
    }
    if (parsed.body === undefined) throw new ApiError(500, 'Missing response body');
    return parsed.body as Resume;
}
