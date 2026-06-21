<script lang="ts">
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
        onsubmit?: (payload: any) => void;
    } = $props();

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

    function handleFieldChange(
        field: keyof BasicsFormData,
        value: string | boolean
    ) {
        if (field === 'name') name = value as string;
        else if (field === 'email') email = value as string;
        else if (field === 'profile_image_url') profile_image_url = value as string;
        else if (field === 'location') location = value as string;
        else if (field === 'github_url') github_url = value as string;
        else if (field === 'mobile_number') mobile_number = value as string;
        else if (field === 'is_public') is_public = value as boolean;
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
            bind:value={name}
            required
            title="Full name shown on the resume."
        />

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
            {#if profile_image_url.trim()}
                <div class="preview-frame">
                    <img
                        src={profile_image_url.trim()}
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
        color: var(--color-text-muted);
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
</style>