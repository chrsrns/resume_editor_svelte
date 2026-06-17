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
    const profileImagePreviewUrl = $derived(profile_image_url.trim());

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

<div class="form-container">
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

        <TextInput
            label="Location"
            bind:value={location}
            title="Optional. City / country (or remote)."
        />

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
    <div>
        <div class="preview-card">
            <p class="preview-label">Profile preview</p>
            {#if profileImagePreviewUrl}
                <div class="preview-frame">
                    <img
                        src={profileImagePreviewUrl}
                        alt={`Profile preview for ${name.trim() || 'resume'}`}
                    />
                </div>
            {:else}
                <div class="preview-empty">Add a profile image URL to preview it here.</div>
            {/if}
        </div>
    </div>
</div>

<style>
    .form {
        display: grid;
        gap: 12px;
        max-width: 520px;
    }

    .form-container {
        display: grid;
        width: 100%;
        grid-template-columns: 1fr 1fr;
        gap: 3rem;
    }

    .preview-card {
        display: grid;
        gap: 10px;
    }

    .preview-label {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: #0f172a;
    }

    .preview-frame,
    .preview-empty {
        width: min(100%, 220px);
        height: 220px;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        background: #f8fafc;
    }

    .preview-frame {
        overflow: hidden;
    }

    .preview-frame img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
    }

    .preview-empty {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        text-align: center;
        color: #64748b;
        font-size: 14px;
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
