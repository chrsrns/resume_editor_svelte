<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { login, register } from '$lib/api/auth';
	import { setAuthToken } from '$lib/auth';
	import { refreshCurrentUser } from '$lib/session';
	import type { ApiError } from '$lib/api/client';
	import TextInput from '$lib/components/ui/TextInput.svelte';

	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);

	async function submit(e: Event) {
		e.preventDefault();
		error = null;
		loading = true;

		try {
			await register({ email, password });
			const token = await login({ email, password });
			setAuthToken(token.token);
			await refreshCurrentUser();
			await goto(resolve('/resumes'));
		} catch (e) {
			const err = e as ApiError;
			error = err.message;
		} finally {
			loading = false;
		}
	}
</script>

<h1>Register</h1>

<form class="form" onsubmit={submit}>
	<TextInput label="Email" type="email" bind:value={email} required autocomplete="email" />

	<TextInput
		label="Password"
		type="password"
		bind:value={password}
		required
		autocomplete="new-password"
	/>

	{#if error}
		<p class="error">{error}</p>
	{/if}

	<button class="button" type="submit" disabled={loading}>
		{loading ? 'Creating…' : 'Create account'}
	</button>
</form>

<p class="muted">
	Already have an account?
	<a href={resolve('/auth/login')}>Login</a>
</p>

<style>
	.form {
		display: grid;
		gap: 12px;
		max-width: 420px;
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
