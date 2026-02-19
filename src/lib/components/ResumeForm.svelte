<script lang="ts">
	import { untrack } from 'svelte';
	import type { NewResumeRequest } from '$lib/types';

	type ResumeFormSubmit = NewResumeRequest & { is_public: boolean };

	let { initial, submitLabel, onsubmit } = $props<{
		initial?: Partial<NewResumeRequest> & { is_public?: boolean | null };
		submitLabel?: string;
		onsubmit?: (payload: ResumeFormSubmit) => void;
	}>();

	let name = $state(untrack(() => initial?.name ?? ''));
	let email = $state(untrack(() => initial?.email ?? ''));
	let profile_image_url = $state(untrack(() => initial?.profile_image_url ?? ''));
	let location = $state(untrack(() => initial?.location ?? ''));
	let github_url = $state(untrack(() => initial?.github_url ?? ''));
	let mobile_number = $state(untrack(() => initial?.mobile_number ?? ''));
	let is_public = $state(untrack(() => initial?.is_public ?? false));

	function toNullable(value: string): string | null {
		const trimmed = value.trim();
		return trimmed.length === 0 ? null : trimmed;
	}

	function submit(e: Event) {
		e.preventDefault();
		onsubmit?.({
			name: name.trim(),
			email: email.trim(),
			profile_image_url: toNullable(profile_image_url),
			location: toNullable(location),
			github_url: toNullable(github_url),
			mobile_number: toNullable(mobile_number),
			is_public
		} satisfies ResumeFormSubmit);
	}
</script>

<form class="form" onsubmit={submit}>
	<label class="field">
		<span class="label">Name</span>
		<input class="input" bind:value={name} required title="Full name shown on the resume." />
	</label>

	<label class="field">
		<span class="label">Email</span>
		<input
			class="input"
			type="email"
			bind:value={email}
			required
			title="Primary contact email displayed on the resume."
		/>
	</label>

	<label class="field">
		<span class="label">Profile image URL</span>
		<input
			class="input"
			bind:value={profile_image_url}
			title="Optional. Link to a profile photo image (e.g. https://...)."
		/>
	</label>

	<label class="field">
		<span class="label">Location</span>
		<input class="input" bind:value={location} title="Optional. City / country (or remote)." />
	</label>

	<label class="field">
		<span class="label">GitHub URL</span>
		<input class="input" bind:value={github_url} title="Optional. Link to your GitHub profile." />
	</label>

	<label class="field">
		<span class="label">Mobile number</span>
		<input class="input" bind:value={mobile_number} title="Optional. Phone number for contact." />
	</label>

	<label class="checkbox">
		<input
			type="checkbox"
			bind:checked={is_public}
			title="If enabled, this resume is visible publicly."
		/>
		<span>Public</span>
	</label>

	<button class="button" type="submit">{submitLabel ?? 'Save'}</button>
</form>

<style>
	.form {
		display: grid;
		gap: 12px;
		max-width: 520px;
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

	.checkbox {
		display: flex;
		gap: 8px;
		align-items: center;
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
</style>
