import { browser } from '$app/environment';
import { writable } from 'svelte/store';

const NOTICE_STORAGE_KEY = 'resume_api_session_expired';

function readNoticeFlag(): boolean {
    if (!browser) return false;
    return localStorage.getItem(NOTICE_STORAGE_KEY) === '1';
}

/**
 * Session-expired notice, shared across tabs through `localStorage`. Lives here
 * rather than in `session.ts` because `auth.ts` raises it at store
 * initialization and cannot import `session.ts` without a cycle.
 */
export const sessionExpired = writable<boolean>(readNoticeFlag());

function writeNoticeFlag(value: boolean) {
    if (!browser) return;
    if (value) {
        localStorage.setItem(NOTICE_STORAGE_KEY, '1');
    } else {
        localStorage.removeItem(NOTICE_STORAGE_KEY);
    }
}

export function raiseSessionExpiredNotice() {
    writeNoticeFlag(true);
    sessionExpired.set(true);
}

export function clearSessionExpiredNotice() {
    writeNoticeFlag(false);
    sessionExpired.set(false);
}

if (browser && typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
        if (event.key !== NOTICE_STORAGE_KEY) return;
        sessionExpired.set(event.newValue === '1');
    });
}
