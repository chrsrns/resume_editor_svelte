import { apiRequest, apiCall } from './client';
import type { Language, NewLanguageRequest, UpdateLanguageRequest } from '$lib/types';

export async function listLanguages(resumeId: string): Promise<Language[]> {
    return apiCall<Language[]>(`/resume/${resumeId}/languages`, { auth: true });
}

export async function createLanguage(
    resumeId: string,
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
