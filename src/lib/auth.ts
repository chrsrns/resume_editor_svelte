import { browser } from '$app/environment';
import { writable } from 'svelte/store';

const TOKEN_STORAGE_KEY = 'resume_api_token';

function getInitialToken(): string | null {
    if (!browser) return null;
    return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export const authToken = writable<string | null>(getInitialToken());

if (browser) {
    authToken.subscribe((token) => {
        if (token) {
            localStorage.setItem(TOKEN_STORAGE_KEY, token);
        } else {
            localStorage.removeItem(TOKEN_STORAGE_KEY);
        }
    });
}

export function setAuthToken(token: string) {
    authToken.set(token);
}

export function clearAuthToken() {
    authToken.set(null);
}
