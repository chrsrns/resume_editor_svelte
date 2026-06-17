import { apiRequest, ApiError } from './client';
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

export async function listPortfolioProjects(resumeId: number): Promise<PortfolioProject[]> {
    const { body } = await apiRequest<PortfolioProject[]>(
        `/resume/${resumeId}/portfolio_projects`,
        {
            auth: true
        }
    );
    if (body === undefined) throw new ApiError(500, 'Missing response body');
    return body;
}

export async function createPortfolioProject(
    resumeId: number,
    payload: NewPortfolioProjectRequest
): Promise<PortfolioProject> {
    const { body } = await apiRequest<PortfolioProject>(`/resume/${resumeId}/portfolio_projects`, {
        method: 'POST',
        body: payload,
        auth: true
    });
    if (body === undefined) throw new ApiError(500, 'Missing response body');
    return body;
}

export async function updatePortfolioProject(
    projectId: number,
    payload: UpdatePortfolioProjectRequest
): Promise<PortfolioProject> {
    const { body } = await apiRequest<PortfolioProject>(`/portfolio_projects/${projectId}`, {
        method: 'PUT',
        body: payload,
        auth: true
    });
    if (body === undefined) throw new ApiError(500, 'Missing response body');
    return body;
}

export async function deletePortfolioProject(projectId: number): Promise<void> {
    await apiRequest(`/portfolio_projects/${projectId}`, { method: 'DELETE', auth: true });
}

export async function listPortfolioKeyPoints(
    resumeId: number,
    projectId: number
): Promise<PortfolioKeyPoint[]> {
    const { body } = await apiRequest<PortfolioKeyPoint[]>(
        `/resume/${resumeId}/portfolio_projects/${projectId}/key_points`,
        { auth: true }
    );
    if (body === undefined) throw new ApiError(500, 'Missing response body');
    return body;
}

export async function createPortfolioKeyPoint(
    resumeId: number,
    projectId: number,
    payload: NewPortfolioKeyPointRequest
): Promise<PortfolioKeyPoint> {
    const { body } = await apiRequest<PortfolioKeyPoint>(
        `/resume/${resumeId}/portfolio_projects/${projectId}/key_points`,
        { method: 'POST', body: payload, auth: true }
    );
    if (body === undefined) throw new ApiError(500, 'Missing response body');
    return body;
}

export async function updatePortfolioKeyPoint(
    keyPointId: number,
    payload: UpdatePortfolioKeyPointRequest
): Promise<PortfolioKeyPoint> {
    const { body } = await apiRequest<PortfolioKeyPoint>(`/portfolio_key_points/${keyPointId}`, {
        method: 'PUT',
        body: payload,
        auth: true
    });
    if (body === undefined) throw new ApiError(500, 'Missing response body');
    return body;
}

export async function deletePortfolioKeyPoint(keyPointId: number): Promise<void> {
    await apiRequest(`/portfolio_key_points/${keyPointId}`, { method: 'DELETE', auth: true });
}

export async function listPortfolioTechnologies(
    resumeId: number,
    projectId: number
): Promise<PortfolioTechnology[]> {
    const { body } = await apiRequest<PortfolioTechnology[]>(
        `/resume/${resumeId}/portfolio_projects/${projectId}/technologies`,
        { auth: true }
    );
    if (body === undefined) throw new ApiError(500, 'Missing response body');
    return body;
}

export async function createPortfolioTechnology(
    resumeId: number,
    projectId: number,
    payload: NewPortfolioTechnologyRequest
): Promise<PortfolioTechnology> {
    const { body } = await apiRequest<PortfolioTechnology>(
        `/resume/${resumeId}/portfolio_projects/${projectId}/technologies`,
        { method: 'POST', body: payload, auth: true }
    );
    if (body === undefined) throw new ApiError(500, 'Missing response body');
    return body;
}

export async function updatePortfolioTechnology(
    technologyId: number,
    payload: UpdatePortfolioTechnologyRequest
): Promise<PortfolioTechnology> {
    const { body } = await apiRequest<PortfolioTechnology>(
        `/portfolio_technologies/${technologyId}`,
        {
            method: 'PUT',
            body: payload,
            auth: true
        }
    );
    if (body === undefined) throw new ApiError(500, 'Missing response body');
    return body;
}

export async function deletePortfolioTechnology(technologyId: number): Promise<void> {
    await apiRequest(`/portfolio_technologies/${technologyId}`, { method: 'DELETE', auth: true });
}
