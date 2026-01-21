import { apiRequest, unwrapBody, ApiError } from './client';
import type { Language, NewLanguageRequest, UpdateLanguageRequest } from '$lib/types';

export async function listLanguages(resumeId: number): Promise<Language[]> {
    const { body } = await apiRequest(`/resume/${resumeId}/languages`, { auth: true });
    if (!body) throw new ApiError(500, 'Missing response body');
    return unwrapBody(body, 'Languages');
}

export async function createLanguage(
    resumeId: number,
    payload: NewLanguageRequest
): Promise<Language> {
    const { body } = await apiRequest(`/resume/${resumeId}/languages`, {
        method: 'POST',
        body: payload,
        auth: true
    });
    if (!body) throw new ApiError(500, 'Missing response body');
    return unwrapBody(body, 'Language');
}

export async function updateLanguage(
    languageId: number,
    payload: UpdateLanguageRequest
): Promise<Language> {
    const { body } = await apiRequest(`/languages/${languageId}`, {
        method: 'PUT',
        body: payload,
        auth: true
    });
    if (!body) throw new ApiError(500, 'Missing response body');
    return unwrapBody(body, 'Language');
}

export async function deleteLanguage(languageId: number): Promise<void> {
    await apiRequest(`/languages/${languageId}`, { method: 'DELETE', auth: true });
}
