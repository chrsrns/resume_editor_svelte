import { apiRequest, ApiError } from './client';
import type { AuthLoginRequest, AuthRegisterRequest, AuthTokenResponse, User } from '$lib/types';

export async function register(payload: AuthRegisterRequest): Promise<User> {
    const { body } = await apiRequest<User>('/auth/register', { method: 'POST', body: payload });
    if (body === undefined) throw new ApiError(500, 'Missing response body');
    return body;
}

export async function login(payload: AuthLoginRequest): Promise<AuthTokenResponse> {
    const { body } = await apiRequest<AuthTokenResponse>('/auth/login', { method: 'POST', body: payload });
    if (body === undefined) throw new ApiError(500, 'Missing response body');
    return body;
}

export async function me(): Promise<User> {
    const { body } = await apiRequest<User>('/auth/me', { auth: true });
    if (body === undefined) throw new ApiError(500, 'Missing response body');
    return body;
}

export async function logout(): Promise<string> {
    const { body } = await apiRequest<string>('/auth/logout', { method: 'POST', auth: true });
    if (body === undefined) throw new ApiError(500, 'Missing response body');
    return body;
}
