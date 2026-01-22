import { get, writable } from 'svelte/store';
import { authToken } from '$lib/auth';
import { me } from '$lib/api/auth';
import type { User } from '$lib/types';

export const currentUser = writable<User | null>(null);

export async function refreshCurrentUser(): Promise<User | null> {
    const token = get(authToken);
    if (!token) {
        currentUser.set(null);
        return null;
    }

    try {
        const user = await me();
        currentUser.set(user);
        return user;
    } catch {
        currentUser.set(null);
        return null;
    }
}

export function clearCurrentUser() {
    currentUser.set(null);
}
