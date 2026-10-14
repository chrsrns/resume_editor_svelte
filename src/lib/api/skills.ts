import { apiRequest, apiCall, ApiError } from './client';
import type { Skill, NewSkillRequest, UpdateSkillRequest } from '$lib/types';

export async function listSkills(resumeId: number): Promise<Skill[]> {
    return apiCall<Skill[]>(`/resume/${resumeId}/skills`, { auth: true });
}

export async function createSkill(resumeId: number, payload: NewSkillRequest): Promise<Skill> {
    return apiCall<Skill>(`/resume/${resumeId}/skills`, {
        method: 'POST',
        body: payload,
        auth: true
    });
}

export async function updateSkill(skillId: number, payload: UpdateSkillRequest): Promise<Skill> {
    return apiCall<Skill>(`/skills/${skillId}`, {
        method: 'PUT',
        body: payload,
        auth: true
    });
}

export async function deleteSkill(skillId: number): Promise<void> {
    await apiRequest(`/skills/${skillId}`, { method: 'DELETE', auth: true });
}
