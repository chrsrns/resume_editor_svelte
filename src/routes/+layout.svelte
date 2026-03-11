<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { authToken, clearAuthToken } from '$lib/auth';
	import { logout } from '$lib/api/auth';
	import { currentUser, refreshCurrentUser, clearCurrentUser } from '$lib/session';

	let { children } = $props();

	onMount(() => {
		void refreshCurrentUser();
	});

	async function handleLogout() {
		try {
			await logout();
		} catch {
			// ignore
		} finally {
			clearAuthToken();
			clearCurrentUser();
			await goto('/auth/login');
		}
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Resume Editor</title>
</svelte:head>

<div class="shell">
	<header class="header">
		<div class="brand"><a class="brandLink" href="/resumes">Resume Editor</a></div>
		<nav class="nav">
			<a class="navLink" href="/resumes">Resumes</a>
			{#if $authToken}
				<span class="user">{$currentUser ? $currentUser.email : 'Signed in'}</span>
				<button class="navButton" type="button" onclick={handleLogout}>Logout</button>
			{:else}
				<a class="navLink" href="/auth/login">Login</a>
				<a class="navLink" href="/auth/register">Register</a>
			{/if}
		</nav>
	</header>
	<main class="main">{@render children()}</main>
</div>

<style>
	.shell {
		min-height: 100vh;
		background: #f8fafc;
		color: #0f172a;
	}

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 14px 18px;
		border-bottom: 1px solid #e2e8f0;
		background: white;
	}

	.brandLink {
		font-weight: 700;
		text-decoration: none;
		color: inherit;
	}

	.nav {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}

	.navLink {
		color: #0f172a;
		text-decoration: none;
		padding: 6px 8px;
		border-radius: 8px;
	}

	.navLink:hover {
		background: #f1f5f9;
	}

	.user {
		color: #475569;
		font-size: 13px;
		padding: 6px 8px;
		border: 1px solid #e2e8f0;
		border-radius: 999px;
	}

	.navButton {
		padding: 8px 12px;
		border: 1px solid #0f172a;
		border-radius: 8px;
		background: #0f172a;
		color: white;
		cursor: pointer;
	}

	.main {
		max-width: 960px;
		margin: 0 auto;
		padding: 20px 18px;
	}
</style>
