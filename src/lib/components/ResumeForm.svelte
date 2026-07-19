<script lang="ts">
    import { basics } from '$lib/stores/draft';
    import TextInput from '$lib/components/ui/TextInput.svelte';
    import TextArea from '$lib/components/ui/TextArea.svelte';
    import Image from '@lucide/svelte/icons/image';

    let { formId }: { formId?: string } = $props();

    // Get draft data from the basics module
    const draft = $derived(basics.getDraft());
    const validationError = $derived(basics.getValidationError());
    const profileImagePreviewUrl = $derived(draft.profile_image_url.trim());

    function handleFieldChange(
        field: keyof Omit<typeof draft, '_status' | '_tempId' | '_validationError'>,
        value: string | boolean
    ) {
        basics.setField(field, value);
    }

    function handleBlur() {
        basics.validate();
    }
</script>

<div class="form-container">
    <form class="form" id={formId}>
        <TextInput
            label="Name"
            value={draft.name}
            oninput={(e) => handleFieldChange('name', (e.currentTarget as HTMLInputElement).value)}
            onblur={handleBlur}
            required
            title="Full name shown on the resume."
        />

        <TextInput
            label="Email"
            type="email"
            value={draft.email}
            oninput={(e) => handleFieldChange('email', (e.currentTarget as HTMLInputElement).value)}
            onblur={handleBlur}
            required
            title="Primary contact email displayed on the resume."
        />

        <TextInput
            label="Profile image URL"
            value={draft.profile_image_url}
            oninput={(e) =>
                handleFieldChange('profile_image_url', (e.currentTarget as HTMLInputElement).value)}
            title="Optional. Link to a profile photo image (e.g. https://...)."
        />

        <TextInput
            label="Location"
            value={draft.location}
            oninput={(e) =>
                handleFieldChange('location', (e.currentTarget as HTMLInputElement).value)}
            title="Optional. City / country (or remote)."
        />

        <TextInput
            label="GitHub URL"
            value={draft.github_url}
            oninput={(e) =>
                handleFieldChange('github_url', (e.currentTarget as HTMLInputElement).value)}
            title="Optional. Link to your GitHub profile."
        />

        <TextInput
            label="Mobile number"
            value={draft.mobile_number}
            oninput={(e) =>
                handleFieldChange('mobile_number', (e.currentTarget as HTMLInputElement).value)}
            title="Optional. Phone number for contact."
        />

        <TextArea
            label="Executive summary"
            value={draft.executive_summary}
            oninput={(e) =>
                handleFieldChange(
                    'executive_summary',
                    (e.currentTarget as HTMLTextAreaElement).value
                )}
            onblur={handleBlur}
            maxlength={5000}
            rows={4}
            maxRows={8}
            title="Optional. A short professional summary."
        />

        <label class="checkbox">
            <input
                type="checkbox"
                checked={draft.is_public}
                onchange={(e) => handleFieldChange('is_public', e.currentTarget.checked)}
                title="If enabled, this resume is visible publicly."
            />
            <span>Public</span>
        </label>

        {#if validationError}
            <p class="error-message">{validationError}</p>
        {/if}
    </form>
    <div>
        <div class="preview-card">
            <p class="preview-label">Profile preview</p>
            {#if profileImagePreviewUrl}
                <div class="preview-frame">
                    <img
                        src={profileImagePreviewUrl}
                        alt={`Profile preview for ${draft.name.trim() || 'resume'}`}
                    />
                </div>
            {:else}
                <div class="preview-empty">
                    <Image size={20} aria-hidden="true" />
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
        overflow: hidden;
    }

    .preview-frame img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .preview-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: var(--space-2);
        color: var(--color-muted);
    }

    .preview-empty span {
        font-size: 12px;
        text-align: center;
    }

    .checkbox {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        font-size: 14px;
        color: var(--color-text);
        cursor: pointer;
    }

    .checkbox input {
        cursor: pointer;
    }

    .error-message {
        margin: 0;
        font-size: 13px;
        color: var(--color-danger);
    }
</style>
