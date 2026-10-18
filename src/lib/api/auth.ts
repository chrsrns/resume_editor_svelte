import { apiCall } from './client';
import type { AuthLoginRequest, AuthRegisterRequest, AuthTokenResponse, User } from '$lib/types';

export async function register(payload: AuthRegisterRequest): Promise<User> {
    return apiCall<User>('/auth/register', { method: 'POST', body: payload });
}

export async function login(payload: AuthLoginRequest): Promise<AuthTokenResponse> {
    return apiCall<AuthTokenResponse>('/auth/login', {
        method: 'POST',
        body: payload
    });
}

export async function me(): Promise<User> {
    return apiCall<User>('/auth/me', { auth: true });
}

export async function logout(): Promise<string> {
    // A deliberate sign-out is not an expired session, so the 401 this can
    // produce must not raise the session-expired notice.
    return apiCall<string>('/auth/logout', {
        method: 'POST',
        auth: true,
        suppressSessionExpiredNotice: true
    });
}
