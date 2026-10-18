import { browser } from '$app/environment';
import { writable } from 'svelte/store';
import { clearSessionExpiredNotice, raiseSessionExpiredNotice } from '$lib/sessionExpiry';

const TOKEN_STORAGE_KEY = 'resume_api_token';
const EXPIRES_STORAGE_KEY = 'resume_api_expires_at';

/**
 * Backend timestamps are naive UTC, so a value carrying no offset has to be
 * read as UTC rather than as local time.
 */
export function parseSessionExpiry(value: string | null): number | null {
    if (!value) return null;
    const normalized = /[Zz]$|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value}Z`;
    const parsed = Date.parse(normalized);
    return Number.isNaN(parsed) ? null : parsed;
}

function getStoredToken(): string | null {
    if (!browser) return null;
    return localStorage.getItem(TOKEN_STORAGE_KEY);
}

function getStoredExpiry(): string | null {
    if (!browser) return null;
    return localStorage.getItem(EXPIRES_STORAGE_KEY);
}

const storedToken = getStoredToken();
const storedExpiry = parseSessionExpiry(getStoredExpiry());
const expiredAtBoot = storedToken !== null && storedExpiry !== null && storedExpiry <= Date.now();

export const authToken = writable<string | null>(expiredAtBoot ? null : storedToken);

if (browser) {
    authToken.subscribe((token) => {
        if (token) {
            localStorage.setItem(TOKEN_STORAGE_KEY, token);
        } else {
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            localStorage.removeItem(EXPIRES_STORAGE_KEY);
        }
    });
}

if (expiredAtBoot) {
    raiseSessionExpiredNotice();
}

export function setAuthToken(token: string, expiresAt?: string | null) {
    if (browser) {
        if (expiresAt) {
            localStorage.setItem(EXPIRES_STORAGE_KEY, expiresAt);
        } else {
            localStorage.removeItem(EXPIRES_STORAGE_KEY);
        }
    }
    clearSessionExpiredNotice();
    authToken.set(token);
}

export function clearAuthToken() {
    authToken.set(null);
}
