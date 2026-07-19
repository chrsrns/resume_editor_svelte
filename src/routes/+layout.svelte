<script lang="ts">
    import '../app.css';
    import favicon from '$lib/assets/favicon.svg';
    import { onMount } from 'svelte';
    import { resolve } from '$app/paths';
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import { authToken, clearAuthToken } from '$lib/auth';
    import { logout } from '$lib/api/auth';
    import { currentUser, refreshCurrentUser, clearCurrentUser } from '$lib/session';
    import FileText from '@lucide/svelte/icons/file-text';
    import LogOut from '@lucide/svelte/icons/log-out';
    import HeadsUpDialog from '$lib/components/ui/HeadsUpDialog.svelte';

    let { children } = $props();

    onMount(() => {
        void refreshCurrentUser();
    });

    let dialogOpen = $state(false);

    // Check for query parameter on mount
    $effect(() => {
        if (page.url.searchParams.get('source') === 'backend') {
            dialogOpen = true;
        }
    });

    function closeDialog() {
        dialogOpen = false;
        // Remove the query parameter without navigating
        const url = new URL(window.location.href);
        url.searchParams.delete('source');
        window.history.replaceState({}, '', url.toString());
    }

    async function handleLogout() {
        try {
            await logout();
        } catch {
            // ignore
        } finally {
            clearAuthToken();
            clearCurrentUser();
            await goto(resolve('/auth/login'));
        }
    }
</script>

<svelte:head>
    <link rel="icon" href={favicon} />
    <title>Resume Editor</title>
</svelte:head>

<div class="shell">
    <header class="header">
        <div class="brand">
            <a class="brandLink" href={resolve('/resumes')}>
                <span class="brandIcon">
                    <FileText size={20} />
                </span>
                Resume Editor
            </a>
        </div>
        <nav class="nav">
            <a class="navLink" href={resolve('/resumes')}>Resumes</a>
            {#if $authToken}
                <span class="user">{$currentUser ? $currentUser.email : 'Signed in'}</span>
                <button class="navButton" type="button" onclick={handleLogout}>
                    <LogOut size={16} />
                    Logout
                </button>
            {:else}
                <a class="navLink" href={resolve('/auth/login')}>Login</a>
                <a class="navLink" href={resolve('/auth/register')}>Register</a>
            {/if}
        </nav>
    </header>
    <main class="main">{@render children()}</main>
</div>

<HeadsUpDialog open={dialogOpen} onclose={closeDialog} />

<style>
    .shell {
        min-height: 100vh;
        background: var(--color-background);
        color: var(--color-text);
    }

    .header {
        position: sticky;
        top: 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-4);
        padding: 14px 18px;
        border-bottom: 1px solid var(--color-border);
        background: var(--color-surface);
        z-index: 50;
    }

    .brandLink {
        font-weight: 700;
        text-decoration: none;
        color: inherit;
        display: inline-flex;
        align-items: center;
        gap: var(--space-2);
    }

    .brandIcon {
        color: var(--color-primary);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: var(--radius-sm);
        background: var(--color-primary-light);
    }

    .nav {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        flex-wrap: wrap;
    }

    .navLink {
        color: var(--color-text);
        text-decoration: none;
        padding: var(--space-1-5) var(--space-2);
        border-radius: var(--radius-sm);
        font-weight: 500;
        font-size: 14px;
    }

    .navLink:hover {
        background: var(--color-primary-light);
        color: var(--color-primary);
    }

    .navLink:focus-visible {
        outline: 2px solid var(--color-primary);
        outline-offset: 2px;
    }

    .user {
        color: var(--color-muted);
        font-size: 13px;
        padding: var(--space-1-5) var(--space-2-5);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-pill);
        background: var(--color-background);
    }

    .navButton {
        display: inline-flex;
        align-items: center;
        gap: var(--space-1-5);
        padding: var(--space-2) var(--space-3);
        border: 1px solid var(--color-text);
        border-radius: var(--radius-sm);
        background: var(--color-text);
        color: var(--color-surface);
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
    }

    .navButton:hover {
        background: var(--color-primary);
        border-color: var(--color-primary);
    }

    .navButton:focus-visible {
        outline: 2px solid var(--color-primary);
        outline-offset: 2px;
    }

    .main {
        max-width: 960px;
        margin: 0 auto;
        padding: var(--space-5) 18px;
    }
</style>
