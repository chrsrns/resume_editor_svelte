<script lang="ts">
    import { snapshotToSections } from '$lib/revisions';
    import { formatVariantTargetDate } from '$lib/variants';
    import {
        formatPartialDateLong,
        parsePartialDate,
        visibilityLabel,
        type ResumeSnapshot
    } from '$lib/types';
    import ActiveStatus from '$lib/components/ui/ActiveStatus.svelte';
    import FieldRow from '$lib/components/FieldRow.svelte';
    import ExecutiveSummaryCard from '$lib/components/ExecutiveSummaryCard.svelte';
    import Eye from '@lucide/svelte/icons/eye';
    import Mail from '@lucide/svelte/icons/mail';
    import Image from '@lucide/svelte/icons/image';
    import MapPin from '@lucide/svelte/icons/map-pin';
    import Link from '@lucide/svelte/icons/link';
    import Phone from '@lucide/svelte/icons/phone';
    import Video from '@lucide/svelte/icons/video';

    let { snapshot }: { snapshot: ResumeSnapshot } = $props();

    const sections = $derived(snapshotToSections(snapshot));

    const isVariant = $derived(
        snapshot.company_name !== null ||
            snapshot.role_title !== null ||
            snapshot.target_date !== null ||
            snapshot.job_description !== null ||
            snapshot.variant_label !== null
    );

    function formatDateRange(start: string, end: string | null): string {
        const startDisplay = formatPartialDateLong(parsePartialDate(start));
        const endDisplay =
            end && end.trim().length > 0
                ? formatPartialDateLong(parsePartialDate(end))
                : 'Present';
        return `${startDisplay} - ${endDisplay}`;
    }
</script>

<div class="snapshot">
    <div class="card">
        <FieldRow Icon={Eye} label="Name" value={snapshot.name} copyable={false} />
        <FieldRow
            Icon={Eye}
            label="Visibility"
            value={visibilityLabel(snapshot.visibility)}
            copyable={false}
        />
        <FieldRow Icon={Mail} label="Email" value={snapshot.email} copyable={false} />
        <FieldRow
            Icon={Image}
            label="Profile Image URL"
            value={snapshot.profile_image_url ?? '-'}
            href={snapshot.profile_image_url ?? undefined}
            copyable={!!snapshot.profile_image_url}
        />
        <FieldRow
            Icon={MapPin}
            label="Location"
            value={snapshot.location ?? '-'}
            copyable={false}
        />
        <FieldRow
            Icon={Link}
            label="GitHub"
            value={snapshot.github_url ?? '-'}
            href={snapshot.github_url ?? undefined}
            copyable={!!snapshot.github_url}
        />
        <FieldRow
            Icon={Video}
            label="Video"
            value={snapshot.video ?? '-'}
            href={snapshot.video ?? undefined}
            copyable={!!snapshot.video}
        />
        <FieldRow
            Icon={Phone}
            label="Mobile"
            value={snapshot.mobile_number ?? '-'}
            copyable={false}
        />
    </div>

    {#if isVariant}
        <div class="card sectionCard">
            <h2 class="sectionTitle">Variant targeting</h2>
            {#if snapshot.company_name}
                <p class="bodyText"><span class="meta">Company</span> {snapshot.company_name}</p>
            {/if}
            {#if snapshot.role_title}
                <p class="bodyText"><span class="meta">Role</span> {snapshot.role_title}</p>
            {/if}
            {#if snapshot.target_date}
                <p class="bodyText">
                    <span class="meta">Target date</span>
                    {formatVariantTargetDate(snapshot.target_date)}
                </p>
            {/if}
            {#if snapshot.variant_label}
                <p class="bodyText"><span class="meta">Label</span> {snapshot.variant_label}</p>
            {/if}
            {#if snapshot.job_description}
                <p class="bodyText muted">{snapshot.job_description}</p>
            {/if}
        </div>
    {/if}

    <ExecutiveSummaryCard summary={snapshot.executive_summary} />

    {#if sections.educations.length > 0}
        <h2 class="sectionTitle">Education</h2>
        <div class="stack">
            {#each sections.educations as entry (entry.education.id)}
                <div class="card sectionCard">
                    <div class="sectionHead">
                        <div>
                            <h2>
                                {entry.education.education_stage}
                                {#if entry.education.active === false}
                                    <ActiveStatus active={false} size="sm" />
                                {/if}
                            </h2>
                            <p class="meta">{entry.education.institution_name}</p>
                        </div>
                        <p class="date">
                            {formatDateRange(entry.education.start_date, entry.education.end_date)}
                        </p>
                    </div>
                    {#if entry.education.degree}
                        <p class="bodyText">{entry.education.degree}</p>
                    {/if}
                    {#if entry.education.description}
                        <p class="bodyText muted">{entry.education.description}</p>
                    {/if}
                    {#if entry.keyPoints.length > 0}
                        <ul class="bulletList">
                            {#each entry.keyPoints as keyPoint (keyPoint.id)}
                                <li>
                                    {keyPoint.key_point}
                                    {#if keyPoint.active === false}
                                        <ActiveStatus active={false} size="sm" />
                                    {/if}
                                </li>
                            {/each}
                        </ul>
                    {/if}
                </div>
            {/each}
        </div>
    {/if}

    {#if sections.workExperiences.length > 0}
        <h2 class="sectionTitle">Work experience</h2>
        <div class="stack">
            {#each sections.workExperiences as entry (entry.experience.id)}
                <div class="card sectionCard">
                    <div class="sectionHead">
                        <div>
                            <h2>
                                {entry.experience.job_title}
                                {#if entry.experience.active === false}
                                    <ActiveStatus active={false} size="sm" />
                                {/if}
                            </h2>
                            <p class="meta">{entry.experience.company_name ?? '-'}</p>
                        </div>
                        <p class="date">
                            {formatDateRange(
                                entry.experience.start_date,
                                entry.experience.end_date
                            )}
                        </p>
                    </div>
                    {#if entry.experience.description}
                        <p class="bodyText muted">{entry.experience.description}</p>
                    {/if}
                    {#if entry.keyPoints.length > 0}
                        <ul class="bulletList">
                            {#each entry.keyPoints as keyPoint (keyPoint.id)}
                                <li>
                                    {keyPoint.key_point}
                                    {#if keyPoint.active === false}
                                        <ActiveStatus active={false} size="sm" />
                                    {/if}
                                </li>
                            {/each}
                        </ul>
                    {/if}
                </div>
            {/each}
        </div>
    {/if}

    {#if sections.portfolioProjects.length > 0}
        <h2 class="sectionTitle">Portfolio</h2>
        <div class="stack">
            {#each sections.portfolioProjects as entry (entry.project.id)}
                <div class="card sectionCard">
                    <div class="sectionHead">
                        <div>
                            <h2>
                                {entry.project.project_name}
                                {#if entry.project.active === false}
                                    <ActiveStatus active={false} size="sm" />
                                {/if}
                            </h2>
                            {#if entry.project.description}
                                <p class="bodyText muted">{entry.project.description}</p>
                            {/if}
                        </div>
                        <div class="linkGroup">
                            {#if entry.project.project_link}
                                <a
                                    class="link"
                                    href={entry.project.project_link}
                                    target="_blank"
                                    rel="external">Preview</a
                                >
                            {/if}
                            {#if entry.project.source_code_link}
                                <a
                                    class="link"
                                    href={entry.project.source_code_link}
                                    target="_blank"
                                    rel="external">Source</a
                                >
                            {/if}
                        </div>
                    </div>
                    {#if entry.project.image_url}
                        <img
                            class="projectImage"
                            src={entry.project.image_url}
                            alt={`Preview of ${entry.project.project_name}`}
                        />
                    {/if}
                    <FieldRow
                        Icon={Video}
                        label="Video URL"
                        value={entry.project.video_url ?? '-'}
                        href={entry.project.video_url ?? undefined}
                        copyable={!!entry.project.video_url}
                    />
                    {#if entry.technologies.length > 0}
                        <div class="chips">
                            {#each entry.technologies as technology (technology.id)}
                                <span class="chip">
                                    {technology.technology_name}
                                    {#if technology.active === false}
                                        <ActiveStatus active={false} size="sm" />
                                    {/if}
                                </span>
                            {/each}
                        </div>
                    {/if}
                    {#if entry.keyPoints.length > 0}
                        <ul class="bulletList">
                            {#each entry.keyPoints as keyPoint (keyPoint.id)}
                                <li>
                                    {keyPoint.key_point}
                                    {#if keyPoint.active === false}
                                        <ActiveStatus active={false} size="sm" />
                                    {/if}
                                </li>
                            {/each}
                        </ul>
                    {/if}
                </div>
            {/each}
        </div>
    {/if}

    {#if sections.skills.length > 0}
        <h2 class="sectionTitle">Skills</h2>
        <div class="card">
            <div class="skillStack">
                {#each sections.skills as skill (skill.id)}
                    <div class="skillRow">
                        <div>
                            <p class="skillName">{skill.skill_name}</p>
                            <p class="skillMeta">{skill.confidence_percentage}% confidence</p>
                        </div>
                        <div class="skillTrack" aria-hidden="true">
                            <div
                                class="skillBar"
                                style={`width: ${skill.confidence_percentage}%`}
                            ></div>
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    {/if}

    {#if sections.languages.length > 0}
        <h2 class="sectionTitle">Languages &amp; Frameworks</h2>
        <div class="stack">
            {#each sections.languages as entry (entry.language.id)}
                <div class="card sectionCard">
                    <div class="sectionHead languageHead">
                        <h2>{entry.language.language_name}</h2>
                        <p class="date">
                            {entry.frameworks.length}
                            {entry.frameworks.length === 1 ? 'framework' : 'frameworks'}
                        </p>
                    </div>
                    {#if entry.frameworks.length > 0}
                        <div class="chips">
                            {#each entry.frameworks as framework (framework.id)}
                                <span class="chip">{framework.framework_name}</span>
                            {/each}
                        </div>
                    {:else}
                        <p class="bodyText muted">No frameworks listed.</p>
                    {/if}
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .snapshot {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
    }

    .sectionTitle {
        margin: var(--space-2) 0 0;
        font-size: 15px;
        font-weight: 700;
        color: var(--color-muted);
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }

    .card {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-card);
        overflow: hidden;
    }

    .stack {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
    }

    .sectionCard {
        padding: var(--space-5);
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
    }

    .sectionHead {
        display: flex;
        justify-content: space-between;
        gap: var(--space-2);
        align-items: flex-start;
    }

    .languageHead {
        flex-direction: row;
        align-items: center;
    }

    .sectionHead h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 700;
        color: var(--color-text);
        display: flex;
        align-items: center;
        gap: var(--space-2);
    }

    .date {
        margin: 0;
        color: var(--color-muted);
        font-size: 13px;
        white-space: nowrap;
    }

    .meta {
        margin: 0;
        color: var(--color-muted);
        font-size: 13px;
    }

    .bodyText {
        margin: 0;
        color: var(--color-text);
        font-size: 14px;
        line-height: 1.6;
    }

    .bodyText.muted {
        color: var(--color-muted);
    }

    .bulletList {
        margin: 0;
        padding-left: var(--space-4-5);
        color: var(--color-text);
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
        font-size: 14px;
    }

    .chips {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
    }

    .chip {
        display: inline-flex;
        align-items: center;
        gap: var(--space-1-5);
        padding: var(--space-1-5) var(--space-2-5);
        border-radius: var(--radius-pill);
        background: var(--color-primary-light);
        color: var(--color-primary);
        font-size: 13px;
        font-weight: 500;
    }

    .linkGroup {
        display: flex;
        gap: var(--space-3);
        flex-shrink: 0;
    }

    .link {
        color: var(--color-primary);
        text-decoration: none;
        word-break: break-word;
        font-size: 14px;
        font-weight: 500;
    }

    .link:hover {
        text-decoration: underline;
    }

    .projectImage {
        width: 100%;
        max-height: 240px;
        object-fit: cover;
        border-radius: var(--radius-sm);
        border: 1px solid var(--color-border);
    }

    .skillStack {
        display: flex;
        flex-direction: column;
    }

    .skillRow {
        display: flex;
        flex-direction: column;
        gap: var(--space-1-5);
        padding: var(--space-3) var(--space-5);
    }

    .skillRow + .skillRow {
        border-top: 1px solid var(--color-border);
    }

    .skillName {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: var(--color-text);
    }

    .skillMeta {
        margin: 0;
        color: var(--color-muted);
        font-size: 13px;
    }

    .skillTrack {
        height: 6px;
        border-radius: var(--radius-pill);
        background: var(--color-background);
        overflow: hidden;
    }

    .skillBar {
        height: 100%;
        background: var(--color-primary);
        border-radius: var(--radius-pill);
    }
</style>
