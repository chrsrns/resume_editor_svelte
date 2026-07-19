<script lang="ts">
    import Button from './Button.svelte';
    import X from '@lucide/svelte/icons/x';
    import ExternalLink from '@lucide/svelte/icons/external-link';
    import { fade, fly } from 'svelte/transition';

    let {
        open,
        onclose
    }: {
        open: boolean;
        onclose?: () => void;
    } = $props();

    const RESUME_URL = 'https://chrsrns.github.io/css-resume/?source=backend';
    const PORTFOLIO_URL = 'https://chrsrns.github.io/personal-projects-portal/?source=backend';

    function handleBackdropClick(e: MouseEvent) {
        if (e.target === e.currentTarget) {
            onclose?.();
        }
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            onclose?.();
        }
    }
</script>

{#if open}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="overlay"
        onclick={handleBackdropClick}
        onkeydown={handleKeydown}
        transition:fade={{ duration: 200 }}
    >
        <div
            class="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            transition:fly={{ duration: 250, y: -20, opacity: 0.5 }}
        >
            <div class="dialog-header">
                <h2 id="dialog-title">Welcome!</h2>
                <button class="close-button" onclick={onclose} aria-label="Close">
                    <X size={20} />
                </button>
            </div>

            <div class="dialog-content">
                <div class="icon-section">
                    <svg
                        width="120"
                        height="80"
                        viewBox="0 0 120 80"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <!-- Server -->
                        <rect
                            x="5"
                            y="10"
                            width="40"
                            height="60"
                            rx="4"
                            fill="var(--color-primary)"
                            opacity="0.9"
                        />
                        <rect
                            x="10"
                            y="20"
                            width="30"
                            height="4"
                            rx="2"
                            fill="var(--color-surface)"
                            opacity="0.8"
                        />
                        <rect
                            x="10"
                            y="28"
                            width="20"
                            height="4"
                            rx="2"
                            fill="var(--color-surface)"
                            opacity="0.6"
                        />
                        <circle cx="32" cy="38" r="3" fill="var(--color-success)" />
                        <circle cx="32" cy="50" r="3" fill="var(--color-success)" />
                        <circle cx="32" cy="62" r="3" fill="var(--color-success)" />

                        <!-- Connection Lines -->
                        <path
                            d="M45 40 L60 40"
                            stroke="var(--color-primary)"
                            stroke-width="2"
                            stroke-dasharray="4 4"
                            opacity="0.6"
                        />
                        <path
                            d="M60 25 L75 25"
                            stroke="var(--color-primary)"
                            stroke-width="2"
                            stroke-dasharray="4 4"
                            opacity="0.6"
                        />
                        <path
                            d="M60 55 L75 55"
                            stroke="var(--color-primary)"
                            stroke-width="2"
                            stroke-dasharray="4 4"
                            opacity="0.6"
                        />

                        <!-- UI/Frontend -->
                        <rect
                            x="75"
                            y="5"
                            width="40"
                            height="30"
                            rx="4"
                            fill="var(--color-primary)"
                            opacity="0.9"
                        />
                        <rect
                            x="80"
                            y="12"
                            width="30"
                            height="2"
                            rx="1"
                            fill="var(--color-surface)"
                            opacity="0.8"
                        />
                        <rect
                            x="80"
                            y="18"
                            width="20"
                            height="2"
                            rx="1"
                            fill="var(--color-surface)"
                            opacity="0.6"
                        />
                        <rect
                            x="80"
                            y="24"
                            width="25"
                            height="2"
                            rx="1"
                            fill="var(--color-surface)"
                            opacity="0.6"
                        />

                        <!-- Another UI -->
                        <rect
                            x="75"
                            y="45"
                            width="40"
                            height="30"
                            rx="4"
                            fill="var(--color-primary)"
                            opacity="0.9"
                        />
                        <rect
                            x="80"
                            y="52"
                            width="30"
                            height="2"
                            rx="1"
                            fill="var(--color-surface)"
                            opacity="0.8"
                        />
                        <rect
                            x="80"
                            y="58"
                            width="15"
                            height="2"
                            rx="1"
                            fill="var(--color-surface)"
                            opacity="0.6"
                        />
                        <rect
                            x="80"
                            y="64"
                            width="20"
                            height="2"
                            rx="1"
                            fill="var(--color-surface)"
                            opacity="0.6"
                        />
                    </svg>
                </div>

                <div class="text-section">
                    <p class="greeting">Hey! Looks like you came from one of my projects!</p>
                    <p class="description">
                        This project uses one of my projects - a dedicated backend server - to
                        retrieve and store resume data. Unlike my Resume page that reads my resume
                        data from my backend server, this project allows me to also edit my resume
                        data.
                    </p>
                    <p class="description">
                        And it is not limited to myself! Others can create and publicize their own
                        resume data here, then create resume pages of their own accessing the
                        backend server.
                    </p>
                    <p class="cta">
                        If you want to see my resume page or go back to my portfolio site, click
                        below!
                    </p>
                </div>

                <div class="cards">
                    <a href={RESUME_URL} target="_blank" rel="noopener noreferrer" class="card">
                        <div class="card-icon">
                            <svg
                                width="32"
                                height="32"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"
                                    stroke="var(--color-primary)"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                />
                                <path
                                    d="M14 2V8H20"
                                    stroke="var(--color-primary)"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                />
                                <path
                                    d="M16 13H8"
                                    stroke="var(--color-primary)"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                />
                                <path
                                    d="M16 17H8"
                                    stroke="var(--color-primary)"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                />
                                <path
                                    d="M10 9H9H8"
                                    stroke="var(--color-primary)"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                />
                            </svg>
                        </div>
                        <div class="card-content">
                            <div class="card-title">My Resume</div>
                            <div class="card-subtitle">View my resume page</div>
                        </div>
                        <div class="card-action">
                            <ExternalLink size={16} />
                        </div>
                    </a>

                    <a href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer" class="card">
                        <div class="card-icon">
                            <svg
                                width="32"
                                height="32"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z"
                                    stroke="var(--color-primary)"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                />
                                <path
                                    d="M9 22V12H15V22"
                                    stroke="var(--color-primary)"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                />
                            </svg>
                        </div>
                        <div class="card-content">
                            <div class="card-title">Portfolio</div>
                            <div class="card-subtitle">Explore my projects</div>
                        </div>
                        <div class="card-action">
                            <ExternalLink size={16} />
                        </div>
                    </a>
                </div>
            </div>

            <div class="dialog-footer">
                <Button variant="primary" onclick={onclose}>Got it!</Button>
            </div>
        </div>
    </div>
{/if}

<style>
    .overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: var(--color-overlay);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: var(--space-4);
        backdrop-filter: blur(4px);
    }

    .dialog {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-card);
        max-width: 600px;
        width: 100%;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
    }

    .dialog-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--space-5) var(--space-5) var(--space-3) var(--space-5);
        border-bottom: 1px solid var(--color-border);
    }

    .dialog-header h2 {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
        color: var(--color-text);
    }

    .close-button {
        background: none;
        border: none;
        color: var(--color-muted);
        cursor: pointer;
        padding: var(--space-1);
        border-radius: var(--radius-sm);
        display: flex;
        align-items: center;
        justify-content: center;
        transition:
            background-color 140ms ease,
            color 140ms ease;
    }

    .close-button:hover {
        background: var(--color-background);
        color: var(--color-text);
    }

    .close-button:focus-visible {
        outline: 2px solid var(--color-primary);
        outline-offset: 2px;
    }

    .dialog-content {
        padding: var(--space-5);
        overflow-y: auto;
        flex: 1;
    }

    .icon-section {
        display: flex;
        justify-content: center;
        margin-bottom: var(--space-5);
    }

    .text-section {
        margin-bottom: var(--space-5);
    }

    .greeting {
        margin: 0 0 var(--space-3) 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--color-text);
    }

    .description {
        margin: 0 0 var(--space-3) 0;
        font-size: 14px;
        line-height: 1.6;
        color: var(--color-text);
    }

    .description:last-of-type {
        margin-bottom: var(--space-4);
    }

    .cta {
        margin: 0;
        font-size: 14px;
        font-weight: 500;
        color: var(--color-muted);
    }

    .cards {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--space-3);
    }

    .card {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        padding: var(--space-4);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        background: var(--color-background);
        text-decoration: none;
        transition:
            border-color 140ms ease,
            box-shadow 140ms ease,
            transform 140ms ease;
    }

    .card:hover {
        border-color: var(--color-primary);
        box-shadow: var(--shadow-card);
        transform: translateY(-2px);
    }

    .card:focus-visible {
        outline: 2px solid var(--color-primary);
        outline-offset: 2px;
    }

    .card-icon {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: var(--radius-sm);
        background: var(--color-surface);
    }

    .card-content {
        flex: 1;
        min-width: 0;
    }

    .card-title {
        font-size: 14px;
        font-weight: 600;
        color: var(--color-text);
        margin-bottom: var(--space-0-5);
    }

    .card-subtitle {
        font-size: 12px;
        color: var(--color-muted);
    }

    .card-action {
        flex-shrink: 0;
        color: var(--color-muted);
        transition: color 140ms ease;
    }

    .card:hover .card-action {
        color: var(--color-primary);
    }

    .dialog-footer {
        display: flex;
        justify-content: center;
        padding: var(--space-4) var(--space-5);
        border-top: 1px solid var(--color-border);
    }

    @media (max-width: 640px) {
        .cards {
            grid-template-columns: 1fr;
        }

        .dialog {
            max-height: 95vh;
        }
    }
</style>
