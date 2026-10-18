<script lang="ts">
    /**
     * Nested child-item list editor (key points, technologies, frameworks).
     * Owns drag/drop reorder, keyboard reorder, drop-over styling, the
     * add-input row, inline updates, blur validation, and deletion.
     * Callers supply the items, the draft text field name, labels, and
     * data callbacks.
     */
    import NestedList from './NestedList.svelte';
    import FieldsWrap from './FieldsWrap.svelte';
    import DragHandle from './DragHandle.svelte';
    import TextInput from '$lib/components/ui/TextInput.svelte';
    import Button from '$lib/components/ui/Button.svelte';
    import Plus from '@lucide/svelte/icons/plus';
    import Trash2 from '@lucide/svelte/icons/trash-2';

    type Item = { id: number; _status?: string } & Record<string, unknown>;

    let {
        items,
        field,
        listTitle,
        itemLabel,
        inputLabel,
        inputTitle,
        addLabel,
        addTitle,
        emptyText,
        dragLabel,
        saving = false,
        onadd,
        onupdate,
        onremove,
        onreorder,
        onvalidate
    }: {
        items: Item[];
        field: string;
        listTitle: string;
        itemLabel: string;
        inputLabel: string;
        inputTitle: string;
        addLabel: string;
        addTitle: string;
        emptyText: string;
        dragLabel: string;
        saving?: boolean;
        onadd: (text: string) => void;
        onupdate: (id: number, value: string) => void;
        onremove: (id: number) => void;
        onreorder: (fromId: number, toId: number) => void;
        onvalidate: (id: number) => void;
    } = $props();

    const visible = $derived(items.filter((i) => i._status !== 'deleted'));

    let newText = $state('');
    let dragging = $state<number | null>(null);
    let dragOver = $state<number | null>(null);

    function handleDragStart(id: number, e: DragEvent) {
        dragging = id;
        dragOver = null;
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', String(id));
        }
    }

    function handleDragEnd() {
        dragging = null;
        dragOver = null;
    }

    function handleDragOver(id: number, e: DragEvent) {
        if (dragging == null) return;
        e.preventDefault();
        e.stopPropagation();
        dragOver = id;
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    }

    function handleDrop(id: number, e: DragEvent) {
        e.preventDefault();
        e.stopPropagation();
        const fromId = dragging;
        handleDragEnd();
        if (fromId == null || fromId === id) return;
        onreorder(fromId, id);
    }

    function handleHandleKeydown(id: number, e: KeyboardEvent) {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
        e.preventDefault();
        const ids = visible.map((i) => i.id);
        const index = ids.indexOf(id);
        if (index === -1) return;
        const nextIndex = e.key === 'ArrowUp' ? index - 1 : index + 1;
        if (nextIndex < 0 || nextIndex >= ids.length) return;
        onreorder(id, ids[nextIndex]);
    }

    function handleAdd() {
        const text = newText.trim();
        if (!text) return;
        onadd(text);
        newText = '';
    }
</script>

<NestedList title={listTitle} loading={false} empty={visible.length === 0} {emptyText}>
    {#each visible as item (item.id)}
        <FieldsWrap
            role="group"
            aria-label={itemLabel}
            class={dragging != null && dragOver === item.id && dragging !== item.id
                ? 'dropOver'
                : ''}
            ondragover={(e) => handleDragOver(item.id, e)}
            ondrop={(e) => handleDrop(item.id, e)}
        >
            <DragHandle
                ondragstart={(e) => handleDragStart(item.id, e)}
                ondragend={handleDragEnd}
                onkeydown={(e) => handleHandleKeydown(item.id, e)}
                disabled={saving}
                dragging={dragging === item.id}
                label={dragLabel}
            />
            <TextInput
                label={inputLabel}
                value={(item[field] as string) ?? ''}
                oninput={(e) => onupdate(item.id, (e.currentTarget as HTMLInputElement).value)}
                onblur={() => onvalidate(item.id)}
                title={inputTitle}
            />
            <Button variant="danger" onclick={() => onremove(item.id)} disabled={saving}>
                {#snippet icon()}<Trash2 size={16} />{/snippet}
                Delete
            </Button>
        </FieldsWrap>
    {/each}
</NestedList>

<FieldsWrap>
    <TextInput
        label={addLabel}
        title={addTitle}
        value={newText}
        oninput={(e) => (newText = (e.currentTarget as HTMLInputElement).value)}
        onkeydown={(e) => {
            if (e.key === 'Enter' && newText.trim().length > 0) {
                handleAdd();
            }
        }}
    />
    <Button onclick={handleAdd} disabled={saving || newText.trim().length === 0} title={addLabel}>
        {#snippet icon()}<Plus size={16} />{/snippet}
        Add
    </Button>
</FieldsWrap>
