import { apiRequest, ApiError } from './client';
import type { Skill, NewSkillRequest, UpdateSkillRequest } from '$lib/types';

export async function listSkills(resumeId: number): Promise<Skill[]> {
    const { body } = await apiRequest<Skill[]>(`/resume/${resumeId}/skills`, { auth: true });
    if (body === undefined) throw new ApiError(500, 'Missing response body');
    return body;
}

export async function createSkill(resumeId: number, payload: NewSkillRequest): Promise<Skill> {
    const { body } = await apiRequest<Skill>(`/resume/${resumeId}/skills`, {
        method: 'POST',
        body: payload,
        auth: true
    });
    if (body === undefined) throw new ApiError(500, 'Missing response body');
    return body;
}

export async function updateSkill(skillId: number, payload: UpdateSkillRequest): Promise<Skill> {
    const { body } = await apiRequest<Skill>(`/skills/${skillId}`, {
        method: 'PUT',
        body: payload,
        auth: true
    });
    if (body === undefined) throw new ApiError(500, 'Missing response body');
    return body;
}

export async function deleteSkill(skillId: number): Promise<void> {
    await apiRequest(`/skills/${skillId}`, { method: 'DELETE', auth: true });
}
