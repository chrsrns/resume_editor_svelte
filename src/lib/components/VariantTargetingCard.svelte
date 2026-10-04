<script lang="ts">
    import type { Resume } from '$lib/types';
    import { basics } from '$lib/stores/draft';
    import { formatVariantTargetDate } from '$lib/variants';
    import FieldRow from './FieldRow.svelte';
    import PartialDateInput from './ui/PartialDateInput.svelte';
    import TextArea from './ui/TextArea.svelte';
    import TextInput from './ui/TextInput.svelte';
    import AlignLeft from '@lucide/svelte/icons/align-left';
    import Briefcase from '@lucide/svelte/icons/briefcase';
    import Building2 from '@lucide/svelte/icons/building-2';
    import Calendar from '@lucide/svelte/icons/calendar';
    import Tag from '@lucide/svelte/icons/tag';

    let { editable = false, resume = null } = $props<{
        editable?: boolean;
        resume?: Resume | null;
    }>();

    const draft = $derived(editable ? basics.getDraft() : null);

    function inputValue(event: Event): string {
        return (event.currentTarget as HTMLInputElement).value;
    }

    function areaValue(event: Event): string {
        return (event.currentTarget as HTMLTextAreaElement).value;
    }
</script>

{#if editable && draft}
    <section class="targetingCard editCard" aria-label="Variant targeting">
        <h3>Variant targeting</h3>
        <div class="fieldGrid">
            <TextInput
                label="Company"
                value={draft.company_name}
                maxlength={255}
                oninput={(e) => basics.setField('company_name', inputValue(e))}
            />
            <TextInput
                label="Role / title"
                value={draft.role_title}
                maxlength={255}
                oninput={(e) => basics.setField('role_title', inputValue(e))}
            />
            <PartialDateInput
                label="Target date"
                value={draft.target_date}
                oninput={(v) => basics.setField('target_date', v)}
            />
            <TextInput
                label="Label"
                value={draft.variant_label}
                maxlength={255}
                oninput={(e) => basics.setField('variant_label', inputValue(e))}
            />
        </div>
        <TextArea
            label="Job description"
            value={draft.job_description}
            maxlength={20000}
            rows={8}
            oninput={(e) => basics.setField('job_description', areaValue(e))}
        />
    </section>
{:else if !editable && resume}
    <section class="targetingCard" aria-label="Variant targeting">
        <h3>Variant targeting</h3>
        <FieldRow
            Icon={Building2}
            label="Company"
            value={resume.company_name ?? '-'}
        />
        <FieldRow
            Icon={Briefcase}
            label="Role / title"
            value={resume.role_title ?? '-'}
        />
        <FieldRow
            Icon={Calendar}
            label="Target date"
            value={formatVariantTargetDate(resume.target_date) ?? '-'}
        />
        <FieldRow Icon={Tag} label="Label" value={resume.variant_label ?? '-'} />
        <div class="jobDescriptionRow">
            <AlignLeft size={16} />
            <div>
                <div class="fieldLabel">Job description</div>
                <div class="jobDescription">{resume.job_description ?? '-'}</div>
            </div>
        </div>
    </section>
{/if}

<style>
    .targetingCard {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-card);
        margin-bottom: var(--space-4);
        padding: var(--space-4);
    }

    .targetingCard h3 {
        font-size: 15px;
        margin: 0 0 var(--space-3);
    }

    .editCard {
        background: var(--color-background);
    }

    .fieldGrid {
        display: grid;
        gap: var(--space-3);
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        margin-bottom: var(--space-3);
    }

    .jobDescriptionRow {
        align-items: flex-start;
        display: flex;
        gap: var(--space-2-5);
        margin-top: var(--space-2);
    }

    .fieldLabel {
        color: var(--color-muted);
        font-size: 12px;
        margin-bottom: var(--space-0-5);
    }

    .jobDescription {
        color: var(--color-text);
        font-size: 14px;
        max-height: 12rem;
        overflow-y: auto;
        white-space: pre-wrap;
    }
</style>
