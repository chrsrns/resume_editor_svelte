<script lang="ts">
	import { untrack } from 'svelte';
	import type { NewResumeRequest } from '$lib/types';
	import TextInput from '$lib/components/ui/TextInput.svelte';

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
	<TextInput label="Name" bind:value={name} required title="Full name shown on the resume." />

	<TextInput
		label="Email"
		type="email"
		bind:value={email}
		required
		title="Primary contact email displayed on the resume."
	/>

	<TextInput
		label="Profile image URL"
		bind:value={profile_image_url}
		title="Optional. Link to a profile photo image (e.g. https://...)."
	/>

	<TextInput label="Location" bind:value={location} title="Optional. City / country (or remote)." />

	<TextInput
		label="GitHub URL"
		bind:value={github_url}
		title="Optional. Link to your GitHub profile."
	/>

	<TextInput
		label="Mobile number"
		bind:value={mobile_number}
		title="Optional. Phone number for contact."
	/>

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
