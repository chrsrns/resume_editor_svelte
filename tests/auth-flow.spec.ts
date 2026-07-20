import { test, expect, type Page } from '@playwright/test';
import { mockApiResponse } from './mocks';
import type { Resume } from '$lib/types';

async function waitForApp(page: Page) {
    await page.waitForLoadState('networkidle');
}

const user = {
    id: 1,
    email: 'test@example.com',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
};

const token = {
    token: 'test-token',
    expires_at: '2024-12-31T23:59:59Z'
};

const resumes: Resume[] = [];

test('login form authenticates and redirects to resumes', async ({ page }) => {
    await mockApiResponse(page, '**/api/auth/login', 200, token);
    await mockApiResponse(page, '**/api/auth/me', 200, user);
    await mockApiResponse(page, '**/api/resumes', 200, resumes);

    await page.goto('/resume_editor/auth/login');
    await waitForApp(page);

    await page.getByRole('textbox', { name: 'Email' }).fill('test@example.com');
    await page.getByRole('textbox', { name: 'Password' }).fill('password123');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL('/resume_editor/resumes');
    await expect(page.getByText('Logout')).toBeVisible();
});

test('register form creates account and redirects to resumes', async ({ page }) => {
    await mockApiResponse(page, '**/api/auth/register', 200, user);
    await mockApiResponse(page, '**/api/auth/login', 200, token);
    await mockApiResponse(page, '**/api/auth/me', 200, user);
    await mockApiResponse(page, '**/api/resumes', 200, resumes);

    await page.goto('/resume_editor/auth/register');
    await waitForApp(page);

    await page.getByRole('textbox', { name: 'Email' }).fill('test@example.com');
    await page.getByRole('textbox', { name: 'Password' }).fill('password123');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page).toHaveURL('/resume_editor/resumes');
    await expect(page.getByText('Logout')).toBeVisible();
});
