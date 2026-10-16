import { apiRequest, apiCall, ApiError } from './client';
import type {
    PortfolioProject,
    PortfolioKeyPoint,
    PortfolioTechnology,
    NewPortfolioProjectRequest,
    NewPortfolioKeyPointRequest,
    NewPortfolioTechnologyRequest,
    UpdatePortfolioProjectRequest,
    UpdatePortfolioKeyPointRequest,
    UpdatePortfolioTechnologyRequest
} from '$lib/types';

export async function listPortfolioProjects(resumeId: string): Promise<PortfolioProject[]> {
    return apiCall<PortfolioProject[]>(
        `/resume/${resumeId}/portfolio_projects`,
        {
            auth: true
        }
    );
}

export async function createPortfolioProject(
    resumeId: string,
    payload: NewPortfolioProjectRequest
): Promise<PortfolioProject> {
    return apiCall<PortfolioProject>(`/resume/${resumeId}/portfolio_projects`, {
        method: 'POST',
        body: payload,
        auth: true
    });
}

export async function updatePortfolioProject(
    projectId: number,
    payload: UpdatePortfolioProjectRequest
): Promise<PortfolioProject> {
    return apiCall<PortfolioProject>(`/portfolio_projects/${projectId}`, {
        method: 'PUT',
        body: payload,
        auth: true
    });
}

export async function deletePortfolioProject(projectId: number): Promise<void> {
    await apiRequest(`/portfolio_projects/${projectId}`, { method: 'DELETE', auth: true });
}

export async function listPortfolioKeyPoints(
    resumeId: string,
    projectId: number
): Promise<PortfolioKeyPoint[]> {
    return apiCall<PortfolioKeyPoint[]>(
        `/resume/${resumeId}/portfolio_projects/${projectId}/key_points`,
        { auth: true }
    );
}

export async function createPortfolioKeyPoint(
    resumeId: string,
    projectId: number,
    payload: NewPortfolioKeyPointRequest
): Promise<PortfolioKeyPoint> {
    return apiCall<PortfolioKeyPoint>(
        `/resume/${resumeId}/portfolio_projects/${projectId}/key_points`,
        { method: 'POST', body: payload, auth: true }
    );
}

export async function updatePortfolioKeyPoint(
    keyPointId: number,
    payload: UpdatePortfolioKeyPointRequest
): Promise<PortfolioKeyPoint> {
    return apiCall<PortfolioKeyPoint>(`/portfolio_key_points/${keyPointId}`, {
        method: 'PUT',
        body: payload,
        auth: true
    });
}

export async function deletePortfolioKeyPoint(keyPointId: number): Promise<void> {
    await apiRequest(`/portfolio_key_points/${keyPointId}`, { method: 'DELETE', auth: true });
}

export async function listPortfolioTechnologies(
    resumeId: string,
    projectId: number
): Promise<PortfolioTechnology[]> {
    return apiCall<PortfolioTechnology[]>(
        `/resume/${resumeId}/portfolio_projects/${projectId}/technologies`,
        { auth: true }
    );
}

export async function createPortfolioTechnology(
    resumeId: string,
    projectId: number,
    payload: NewPortfolioTechnologyRequest
): Promise<PortfolioTechnology> {
    return apiCall<PortfolioTechnology>(
        `/resume/${resumeId}/portfolio_projects/${projectId}/technologies`,
        { method: 'POST', body: payload, auth: true }
    );
}

export async function updatePortfolioTechnology(
    technologyId: number,
    payload: UpdatePortfolioTechnologyRequest
): Promise<PortfolioTechnology> {
    return apiCall<PortfolioTechnology>(
        `/portfolio_technologies/${technologyId}`,
        {
            method: 'PUT',
            body: payload,
            auth: true
        }
    );
}

export async function deletePortfolioTechnology(technologyId: number): Promise<void> {
    await apiRequest(`/portfolio_technologies/${technologyId}`, { method: 'DELETE', auth: true });
}
