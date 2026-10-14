import { apiRequest, apiCall, ApiError } from './client';
import type { Language, NewLanguageRequest, UpdateLanguageRequest } from '$lib/types';

export async function listLanguages(resumeId: number): Promise<Language[]> {
    return apiCall<Language[]>(`/resume/${resumeId}/languages`, { auth: true });
}

export async function createLanguage(
    resumeId: number,
    payload: NewLanguageRequest
): Promise<Language> {
    return apiCall<Language>(`/resume/${resumeId}/languages`, {
        method: 'POST',
        body: payload,
        auth: true
    });
}

export async function updateLanguage(
    languageId: number,
    payload: UpdateLanguageRequest
): Promise<Language> {
    return apiCall<Language>(`/languages/${languageId}`, {
        method: 'PUT',
        body: payload,
        auth: true
    });
}

export async function deleteLanguage(languageId: number): Promise<void> {
    await apiRequest(`/languages/${languageId}`, { method: 'DELETE', auth: true });
}
