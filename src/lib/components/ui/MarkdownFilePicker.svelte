<script lang="ts">
    /**
     * Hidden markdown file input. Owns the accept filter, the per-pick input
     * reset (so picking the same file twice still fires), and delivery of the
     * chosen file via `onpick`. Confirmation, API calls, and post-success
     * behavior stay with the caller.
     *
     * Bind `open` to trigger the picker from your own button:
     * `<MarkdownFilePicker bind:open={openPicker} onpick={handleFile} />`
     */
    let {
        onpick,
        open = $bindable(() => input?.click())
    }: {
        onpick: (file: File) => void;
        open?: () => void;
    } = $props();

    let input: HTMLInputElement | undefined = $state();

    function handleChange(e: Event) {
        const el = e.currentTarget as HTMLInputElement;
        const file = el.files?.[0];
        if (!file) return;
        el.value = '';
        onpick(file);
    }
</script>

<input
    bind:this={input}
    type="file"
    accept=".md,text/markdown"
    onchange={handleChange}
    class="hidden-file-input"
/>

<style>
    .hidden-file-input {
        display: none;
    }
</style>
