<script lang="ts">
    import { untrack } from 'svelte';
    import type { NewResumeRequest } from '$lib/types';
    import TextInput from '$lib/components/ui/TextInput.svelte';
    import Button from '$lib/components/ui/Button.svelte';
    import Save from '@lucide/svelte/icons/save';
    import Image from '@lucide/svelte/icons/image';

    type ResumeFormSubmit = NewResumeRequest & { is_public: boolean };

    let {
        initial,
        submitLabel,
        onsubmit,
        showSubmitButton = true,
        formId
    } = $props<{
        initial?: Partial<NewResumeRequest> & { is_public?: boolean | null };
        submitLabel?: string;
        onsubmit?: (payload: ResumeFormSubmit) => void;
        showSubmitButton?: boolean;
        formId?: string;
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
    <form class="form" id={formId} onsubmit={submit}>
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

        {#if showSubmitButton}
            <Button type="submit">
                {#snippet icon()}<Save size={16} />{/snippet}
                {submitLabel ?? 'Save'}
            </Button>
        {/if}
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
                <div class="preview-empty">
                    <Image size={32} aria-hidden="true" />
                    <span>Add a profile image URL to preview it here.</span>
                </div>
            {/if}
        </div>
    </div>
</div>

<style>
    .form {
        display: grid;
        gap: var(--space-3);
        max-width: 520px;
    }

    .form-container {
        display: grid;
        width: 100%;
        grid-template-columns: 1fr 1fr;
        gap: var(--space-8);
    }

    @media (max-width: 900px) {
        .form-container {
            grid-template-columns: 1fr;
        }
    }

    .preview-card {
        display: grid;
        gap: var(--space-3);
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-card);
        padding: var(--space-5);
        align-content: start;
        justify-items: center;
    }

    .preview-label {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: var(--color-text);
        justify-self: start;
    }

    .preview-frame,
    .preview-empty {
        width: min(100%, 200px);
        height: 200px;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        background: var(--color-background);
        margin: 0 auto;
    }

    .preview-frame {
        overflow: hidden;
        box-shadow: var(--shadow-card);
    }

    .preview-frame img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
    }

    .preview-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: var(--space-2);
        padding: var(--space-4);
        text-align: center;
        color: var(--color-muted);
        font-size: 13px;
    }

    .checkbox {
        display: flex;
        gap: var(--space-2);
        align-items: center;
        color: var(--color-text);
        font-size: 14px;
    }

    .checkbox input[type='checkbox'] {
        accent-color: var(--color-primary);
        width: 18px;
        height: 18px;
        cursor: pointer;
    }
</style>
