<script lang="ts">
	import { goto } from '$app/navigation';
	import { login } from '$lib/api/auth';
	import { setAuthToken } from '$lib/auth';
	import { refreshCurrentUser } from '$lib/session';
	import type { ApiError } from '$lib/api/client';

	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);

	async function submit(e: Event) {
		e.preventDefault();
		error = null;
		loading = true;

		try {
			const token = await login({ email, password });
			setAuthToken(token.token);
			await refreshCurrentUser();
			await goto('/resumes');
		} catch (e) {
			const err = e as ApiError;
			error = err.message;
		} finally {
			loading = false;
		}
	}
</script>

<h1>Login</h1>

<form class="form" onsubmit={submit}>
	<label class="field">
		<span class="label">Email</span>
		<input class="input" type="email" bind:value={email} required autocomplete="email" />
	</label>

	<label class="field">
		<span class="label">Password</span>
		<input
			class="input"
			type="password"
			bind:value={password}
			required
			autocomplete="current-password"
		/>
	</label>

	{#if error}
		<p class="error">{error}</p>
	{/if}

	<button class="button" type="submit" disabled={loading}>
		{loading ? 'Signing in…' : 'Sign in'}
	</button>
</form>

<p class="muted">
	No account?
	<a href="/auth/register">Register</a>
</p>

<style>
	.form {
		display: grid;
		gap: 12px;
		max-width: 420px;
	}

	.field {
		display: grid;
		gap: 6px;
	}

	.label {
		font-size: 12px;
		color: #334155;
	}

	.input {
		padding: 10px 12px;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		background: white;
	}

	.button {
		justify-self: start;
		padding: 10px 14px;
		border: 1px solid #0f172a;
		border-radius: 8px;
		background: #0f172a;
		color: white;
		cursor: pointer;
	}

	.button[disabled] {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.error {
		color: #b91c1c;
		margin: 0;
	}

	.muted {
		color: #475569;
	}
</style>
