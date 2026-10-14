import { describe, it, expect } from 'vitest';
import { work, portfolio } from './index';
import type {
    WorkExperience,
    WorkExperienceKeyPoint,
    PortfolioProject,
    PortfolioKeyPoint,
    PortfolioTechnology
} from '$lib/types';

const workItem: WorkExperience = {
    id: 1,
    resume_id: 10,
    job_title: 'Dev',
    company_name: 'Acme',
    start_date: '2020-01',
    end_date: null,
    description: null,
    display_order: 1,
    active: true,
    created_at: 'c'
};

const workKeyPoint: WorkExperienceKeyPoint = {
    id: 5,
    work_experience_id: 1,
    key_point: 'Did X',
    display_order: 1,
    active: true,
    created_at: 'c'
};

const project: PortfolioProject = {
    id: 2,
    resume_id: 10,
    project_name: 'Proj',
    image_url: null,
    project_link: null,
    source_code_link: null,
    description: null,
    video_url: null,
    display_order: 1,
    active: true,
    created_at: 'c'
};

const projectKeyPoint: PortfolioKeyPoint = {
    id: 6,
    portfolio_project_id: 2,
    key_point: 'KP',
    display_order: 1,
    created_at: 'c'
};

const technology: PortfolioTechnology = {
    id: 7,
    portfolio_project_id: 2,
    technology_name: 'TS',
    display_order: 1,
    created_at: 'c'
};

describe('field-law parity between draft and baseline', () => {
    it('work: whitespace-only optional field is clean after save', () => {
        work.initialize([workItem], []);
        work.updateWork(1, { company_name: ' ' });
        work.applySaveResults(new Map());
        work.commitBaseline();
        expect(work.isDirty()).toBe(false);
    });

    it('work: trailing-space field is clean after save', () => {
        work.initialize([workItem], []);
        work.updateWork(1, { company_name: 'Acme ' });
        work.applySaveResults(new Map());
        work.commitBaseline();
        expect(work.isDirty()).toBe(false);
    });

    it('work: key point with trailing space is clean after save', () => {
        work.initialize([workItem], [workKeyPoint]);
        work.updateKeyPoint(5, { key_point: 'Did X ' });
        work.applySaveResults(new Map());
        work.commitBaseline();
        expect(work.isDirty()).toBe(false);
    });

    it('portfolio: whitespace-only optional field is clean after save', () => {
        portfolio.initialize([project], [], []);
        portfolio.updateProject(2, { video_url: ' ' });
        portfolio.applySaveResults(new Map());
        portfolio.commitBaseline();
        expect(portfolio.isDirty()).toBe(false);
    });

    it('portfolio: trailing-space required field is clean after save', () => {
        portfolio.initialize([project], [], []);
        portfolio.updateProject(2, { project_name: 'Proj ' });
        portfolio.applySaveResults(new Map());
        portfolio.commitBaseline();
        expect(portfolio.isDirty()).toBe(false);
    });

    it('portfolio: key point with trailing space is clean after save', () => {
        portfolio.initialize([project], [projectKeyPoint], []);
        portfolio.updateKeyPoint(6, { key_point: 'KP ' });
        portfolio.applySaveResults(new Map());
        portfolio.commitBaseline();
        expect(portfolio.isDirty()).toBe(false);
    });

    it('portfolio: technology with trailing space is clean after save', () => {
        portfolio.initialize([project], [], [technology]);
        portfolio.updateTechnology(7, { technology_name: 'TS ' });
        portfolio.applySaveResults(new Map());
        portfolio.commitBaseline();
        expect(portfolio.isDirty()).toBe(false);
    });
});
