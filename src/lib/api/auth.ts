import { apiRequest, unwrapBody, ApiError } from './client';
import type { AuthLoginRequest, AuthRegisterRequest, AuthTokenResponse, User } from '$lib/types';

export async function register(payload: AuthRegisterRequest): Promise<User> {
    const { body } = await apiRequest('/auth/register', { method: 'POST', body: payload });
    if (!body) throw new ApiError(500, 'Missing response body');
    return unwrapBody(body, 'User');
}

export async function login(payload: AuthLoginRequest): Promise<AuthTokenResponse> {
    const { body } = await apiRequest('/auth/login', { method: 'POST', body: payload });
    if (!body) throw new ApiError(500, 'Missing response body');
    return unwrapBody(body, 'AuthToken');
}

export async function me(): Promise<User> {
    const { body } = await apiRequest('/auth/me', { auth: true });
    if (!body) throw new ApiError(500, 'Missing response body');
    return unwrapBody(body, 'User');
}

export async function logout(): Promise<string> {
    const { body } = await apiRequest('/auth/logout', { method: 'POST', auth: true });
    if (!body) throw new ApiError(500, 'Missing response body');
    return unwrapBody(body, 'Message');
}
