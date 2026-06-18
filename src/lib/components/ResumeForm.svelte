<script lang="ts">
    import { basics } from '$lib/stores/draft';
    import TextInput from '$lib/components/ui/TextInput.svelte';
    import Button from '$lib/components/ui/Button.svelte';
    import Save from '@lucide/svelte/icons/save';
    import Image from '@lucide/svelte/icons/image';

    type BasicsFormData = {
        name: string;
        email: string;
        profile_image_url: string;
        location: string;
        github_url: string;
        mobile_number: string;
        is_public: boolean;
    };

    let {
        formId,
        showSubmitButton = false,
        initial,
        submitLabel,
        onsubmit
    }: {
        formId?: string;
        showSubmitButton?: boolean;
        initial?: BasicsFormData;
        submitLabel?: string;
        // Keep as any for backward compatibility with old mode (new/+page.svelte)
        // New mode (draft module) doesn't use this prop
        onsubmit?: (payload: any) => void;
    } = $props();

    // Backward compatibility: if initial is provided, use old local state instead of draft module
    let useOldMode = $derived(!!initial);

    let name = $state('');
    let email = $state('');
    let profile_image_url = $state('');
    let location = $state('');
    let github_url = $state('');
    let mobile_number = $state('');
    let is_public = $state(false);

    // Initialize from initial if provided
    $effect(() => {
        if (initial) {
            name = initial.name ?? '';
            email = initial.email ?? '';
            profile_image_url = initial.profile_image_url ?? '';
            location = initial.location ?? '';
            github_url = initial.github_url ?? '';
            mobile_number = initial.mobile_number ?? '';
            is_public = initial.is_public ?? false;
        }
    });

    // Get draft data from the basics module (only used in new mode)
    const draft = $derived(basics.getDraft());
    const validationError = $derived(basics.getValidationError());
    const profileImagePreviewUrl = $derived(
        useOldMode ? profile_image_url.trim() : draft.profile_image_url.trim()
    );

    function handleFieldChange(
        field: keyof Omit<typeof draft, '_status' | '_tempId' | '_validationError'>,
        value: string | boolean
    ) {
        if (useOldMode) {
            // Old mode: update local state
            if (field === 'name') name = value as string;
            else if (field === 'email') email = value as string;
            else if (field === 'profile_image_url') profile_image_url = value as string;
            else if (field === 'location') location = value as string;
            else if (field === 'github_url') github_url = value as string;
            else if (field === 'mobile_number') mobile_number = value as string;
            else if (field === 'is_public') is_public = value as boolean;
        } else {
            // New mode: update draft module
            basics.setField(field, value);
        }
    }

    function handleBlur() {
        if (!useOldMode) {
            basics.validate();
        }
    }

    function submit(e: Event) {
        e.preventDefault();
        if (onsubmit) {
            onsubmit({
                name: name.trim(),
                email: email.trim(),
                profile_image_url: profile_image_url.trim() || null,
                location: location.trim() || null,
                github_url: github_url.trim() || null,
                mobile_number: mobile_number.trim() || null,
                is_public
            });
        }
    }
</script>

<div class="form-container">
    <form class="form" id={formId} onsubmit={submit}>
        <TextInput
            label="Name"
            value={useOldMode ? name : draft.name}
            oninput={(e) => handleFieldChange('name', (e.currentTarget as HTMLInputElement).value)}
            onblur={handleBlur}
            required
            title="Full name shown on the resume."
        />

        <TextInput
            label="Email"
            type="email"
            value={useOldMode ? email : draft.email}
            oninput={(e) => handleFieldChange('email', (e.currentTarget as HTMLInputElement).value)}
            onblur={handleBlur}
            required
            title="Primary contact email displayed on the resume."
        />

        <TextInput
            label="Profile image URL"
            value={useOldMode ? profile_image_url : draft.profile_image_url}
            oninput={(e) =>
                handleFieldChange('profile_image_url', (e.currentTarget as HTMLInputElement).value)}
            title="Optional. Link to a profile photo image (e.g. https://...)."
        />

        <TextInput
            label="Location"
            value={useOldMode ? location : draft.location}
            oninput={(e) =>
                handleFieldChange('location', (e.currentTarget as HTMLInputElement).value)}
            title="Optional. City / country (or remote)."
        />

        <TextInput
            label="GitHub URL"
            value={useOldMode ? github_url : draft.github_url}
            oninput={(e) =>
                handleFieldChange('github_url', (e.currentTarget as HTMLInputElement).value)}
            title="Optional. Link to your GitHub profile."
        />

        <TextInput
            label="Mobile number"
            value={useOldMode ? mobile_number : draft.mobile_number}
            oninput={(e) =>
                handleFieldChange('mobile_number', (e.currentTarget as HTMLInputElement).value)}
            title="Optional. Phone number for contact."
        />

        <label class="checkbox">
            <input
                type="checkbox"
                checked={useOldMode ? is_public : draft.is_public}
                onchange={(e) => handleFieldChange('is_public', e.currentTarget.checked)}
                title="If enabled, this resume is visible publicly."
            />
            <span>Public</span>
        </label>

        {#if !useOldMode && validationError}
            <p class="error-message">{validationError}</p>
        {/if}

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
                        alt={`Profile preview for ${useOldMode ? name.trim() : draft.name.trim() || 'resume'}`}
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

    .error-message {
        color: var(--color-danger);
        font-size: 13px;
        margin: 0;
    }
</style>
