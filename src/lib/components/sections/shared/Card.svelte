<script lang="ts">
    type Variant = 'card' | 'new' | 'no-padding';

    let {
        variant = 'card',
        class: className = '',
        children
    } = $props<{
        variant?: Variant;
        class?: string;
        children: import('svelte').Snippet;
    }>();

    function classes() {
        return ['card', variant === 'card' ? '' : variant, className].filter(Boolean).join(' ');
    }
</script>

<div class={classes()}>
    {@render children()}
</div>

<style>
    .card {
        display: flex;
        flex-direction: column;
        gap: 12px;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 12px;
        background: #f8fafc;
        margin-bottom: 12px;
    }

    .card.new {
        background: #ffffff;
        border-color: #94a3b8;
        border-style: dashed;
    }

    .card.no-padding {
        padding: 0;
    }
</style>
