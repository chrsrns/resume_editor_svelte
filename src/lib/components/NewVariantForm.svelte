<script lang="ts">
    import { onMount } from 'svelte';
    import { get } from 'svelte/store';
    import { goto } from '$app/navigation';
    import { resolve } from '$app/paths';
    import { createVariant, getResume } from '$lib/api/resumes';
    import { ApiError } from '$lib/api/client';
    import { currentUser, refreshCurrentUser } from '$lib/session';
    import type { Resume, Visibility } from '$lib/types';
    import Button from './ui/Button.svelte';
    import ErrorDialog from './ui/ErrorDialog.svelte';
    import PartialDateInput from './ui/PartialDateInput.svelte';
    import TextArea from './ui/TextArea.svelte';
    import TextInput from './ui/TextInput.svelte';
    import VisibilityRadioGroup from './ui/VisibilityRadioGroup.svelte';
    import { FIELD_LIMITS, checkMaxLen } from '$lib/limits';

    let { baseId, oncancel } = $props<{
        baseId: string;
        oncancel: () => void;
    }>();

    let loading = $state(true);
    let forbidden = $state(false);
    let loadError = $state<string | null>(null);
    let base = $state<Resume | null>(null);

    let companyName = $state('');
    let roleTitle = $state('');
    let targetDate = $state('');
    let variantLabel = $state('');
    let jobDescription = $state('');
    let visibility = $state<Visibility>('private');
    let showVariantTag = $state(true);
    let submitting = $state(false);
    let formError = $state<string | null>(null);
    let errorOpen = $state(false);
    let errorTitle = $state('Create variant failed');
    let errorMessage = $state('');

    async function loadBase() {
        try {
            base = await getResume(baseId);
            await refreshCurrentUser();
            const user = get(currentUser);
            visibility = base.visibility;
            forbidden = !user || base.created_by !== user.id;
        } catch (e) {
            const err = e as ApiError;
            if (err.status === 403 || err.status === 404) {
                forbidden = true;
            } else {
                loadError = err.message;
            }
        } finally {
            loading = false;
        }
    }

    onMount(() => {
        void loadBase();
    });

    function nullable(value: string): string | null {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
    }

    function validateForm(): string | null {
        return (
            checkMaxLen('Company name', companyName, FIELD_LIMITS.company_name) ??
            checkMaxLen('Role title', roleTitle, FIELD_LIMITS.role_title) ??
            checkMaxLen('Variant label', variantLabel, FIELD_LIMITS.variant_label) ??
            checkMaxLen('Job description', jobDescription, FIELD_LIMITS.job_description)
        );
        if (targetDate.trim() && !/^\d{4}(-\d{2}(-\d{2})?)?$/.test(targetDate.trim())) {
            return 'Target date must be YYYY, YYYY-MM, or YYYY-MM-DD';
        }
        return null;
    }

    async function handleSubmit(event: SubmitEvent) {
        event.preventDefault();
        if (!base || submitting) return;

        formError = validateForm();
        if (formError) return;

        submitting = true;
        try {
            const created = await createVariant(baseId, {
                company_name: nullable(companyName),
                role_title: nullable(roleTitle),
                target_date: nullable(targetDate),
                job_description: nullable(jobDescription),
                variant_label: nullable(variantLabel),
                visibility,
                show_variant_tag: showVariantTag
            });
            await goto(resolve(`/resumes/${created.id}/edit`));
        } catch (e) {
            const err = e as ApiError;
            errorTitle = 'Create variant failed';
            errorMessage = err.message;
            errorOpen = true;
        } finally {
            submitting = false;
        }
    }
</script>

{#if loading}
    <p class="muted">Loading…</p>
{:else if forbidden}
    <div class="formCard">
        <p class="forbidden">Forbidden</p>
    </div>
{:else if loadError}
    <p class="error">{loadError}</p>
{:else if base}
    <form class="formCard" onsubmit={handleSubmit}>
        <p class="muted">Copy of {base.name}</p>

        <TextInput
            label="Company"
            value={companyName}
            maxlength={FIELD_LIMITS.company_name}
            oninput={(e) => (companyName = (e.currentTarget as HTMLInputElement).value)}
        />
        <TextInput
            label="Role / title"
            value={roleTitle}
            maxlength={FIELD_LIMITS.role_title}
            oninput={(e) => (roleTitle = (e.currentTarget as HTMLInputElement).value)}
        />
        <PartialDateInput
            label="Target date"
            value={targetDate}
            oninput={(v) => (targetDate = v)}
        />
        <TextInput
            label="Label"
            value={variantLabel}
            maxlength={FIELD_LIMITS.variant_label}
            oninput={(e) => (variantLabel = (e.currentTarget as HTMLInputElement).value)}
        />
        <TextArea
            label="Job description"
            value={jobDescription}
            maxlength={FIELD_LIMITS.job_description}
            rows={8}
            oninput={(e) => (jobDescription = (e.currentTarget as HTMLTextAreaElement).value)}
        />

        <VisibilityRadioGroup
            value={visibility}
            onchange={(v) => (visibility = v)}
        />
        <div class="checkboxRow">
            <label class="checkboxLabel">
                <input type="checkbox" bind:checked={showVariantTag} />
                Show variant tag
            </label>
        </div>
        <p class="help">
            Hide the tag to hide variant status from viewers who cannot see the base.
        </p>

        {#if formError}
            <p class="error">{formError}</p>
        {/if}

        <div class="actions">
            <Button type="submit" disabled={submitting}>Create variant</Button>
            <Button variant="secondary" onclick={oncancel}>Cancel</Button>
        </div>
    </form>
{/if}

<ErrorDialog
    open={errorOpen}
    title={errorTitle}
    message={errorMessage}
    onclose={() => (errorOpen = false)}
/>

<style>
    .formCard {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-card);
        display: grid;
        gap: var(--space-3);
        max-width: 720px;
        padding: var(--space-4);
    }

    .checkboxRow {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-4);
    }

    .checkboxLabel {
        align-items: center;
        display: flex;
        gap: var(--space-2);
        font-size: 14px;
    }

    .actions {
        display: flex;
        gap: var(--space-2);
    }

    .muted {
        color: var(--color-muted);
        margin: 0;
    }

    .help {
        color: var(--color-muted);
        font-size: 12px;
        margin: calc(-1 * var(--space-2)) 0 0;
    }

    .error,
    .forbidden {
        color: var(--color-danger);
        margin: 0;
    }
</style>
