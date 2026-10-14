import { apiCall, ApiError } from './client';
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
    return apiCall<string>('/auth/logout', { method: 'POST', auth: true });
}
