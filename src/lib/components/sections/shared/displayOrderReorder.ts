export type OrderableDraft = { id: number; display_order: string };

export function byDisplayOrder(
	a: { display_order: number | null; id: number },
	b: { display_order: number | null; id: number }
) {
	const ao = a.display_order ?? Number.POSITIVE_INFINITY;
	const bo = b.display_order ?? Number.POSITIVE_INFINITY;
	if (ao !== bo) return ao - bo;
	return a.id - b.id;
}

function moveItem<T>(arr: T[], fromIndex: number, toIndex: number): T[] {
	if (fromIndex === toIndex) return arr;
	const copy = arr.slice();
	const [item] = copy.splice(fromIndex, 1);
	copy.splice(toIndex, 0, item);
	return copy;
}

function updateSavedSigDisplayOrder(saved: Record<number, string>, id: number, newOrder: number) {
	const prev = saved[id];
	if (!prev) return saved;
	try {
		const obj = JSON.parse(prev) as Record<string, unknown>;
		obj.display_order = newOrder;
		return { ...saved, [id]: JSON.stringify(obj) };
	} catch {
		return saved;
	}
}

async function persistDisplayOrders<TDraft extends OrderableDraft>(
	currentDrafts: TDraft[],
	prevDrafts: TDraft[],
	parseOrder: (value: string) => number | null,
	updateDisplayOrder: (id: number, display_order: number) => Promise<unknown>,
	orderStep: number
) {
	const updates: Promise<unknown>[] = [];
	for (let i = 0; i < currentDrafts.length; i++) {
		const d = currentDrafts[i];
		const newOrder = (i + 1) * orderStep;
		const prevOrder = parseOrder(prevDrafts.find((x) => x.id === d.id)?.display_order ?? '');
		if (prevOrder === newOrder) continue;
		updates.push(updateDisplayOrder(d.id, newOrder));
	}
	await Promise.all(updates);
}

export function createDisplayOrderReorder<TDraft extends OrderableDraft>(opts: {
	getDrafts: () => TDraft[];
	setDrafts: (drafts: TDraft[]) => void;
	getSavedSigs: () => Record<number, string>;
	setSavedSigs: (saved: Record<number, string>) => void;
	getReordering: () => boolean;
	setReordering: (reordering: boolean) => void;
	setError: (message: string | null) => void;
	getErrorMessage: (e: unknown) => string;
	parseOrder: (value: string) => number | null;
	updateDisplayOrder: (id: number, display_order: number) => Promise<unknown>;
	orderStep?: number;
}) {
	const orderStep = opts.orderStep ?? 10;

	async function reorderByIds(fromId: number, toId: number) {
		if (opts.getReordering()) return;
		if (fromId === toId) return;

		const drafts = opts.getDrafts();
		const fromIndex = drafts.findIndex((d) => d.id === fromId);
		const toIndex = drafts.findIndex((d) => d.id === toId);
		if (fromIndex === -1 || toIndex === -1) return;

		const prevDrafts = drafts.map((d) => ({ ...d }));
		const prevSaved = { ...opts.getSavedSigs() };

		let nextSaved = prevSaved;
		const reordered = moveItem(drafts, fromIndex, toIndex).map((d, i) => {
			const newOrder = (i + 1) * orderStep;
			nextSaved = updateSavedSigDisplayOrder(nextSaved, d.id, newOrder);
			return { ...d, display_order: String(newOrder) };
		});

		opts.setDrafts(reordered);
		opts.setSavedSigs(nextSaved);

		opts.setReordering(true);
		opts.setError(null);
		try {
			await persistDisplayOrders(reordered, prevDrafts, opts.parseOrder, opts.updateDisplayOrder, orderStep);
		} catch (e) {
			opts.setError(opts.getErrorMessage(e));
			opts.setDrafts(prevDrafts);
			opts.setSavedSigs(prevSaved);
		} finally {
			opts.setReordering(false);
		}
	}

	return {
		reorderByIds
	};
}

export function createCardDragReorder(opts: {
	getDraggingId: () => number | null;
	setDraggingId: (id: number | null) => void;
	setDragOverId: (id: number | null) => void;
	getReordering: () => boolean;
	getOrderedIds: () => number[];
	reorderByIds: (fromId: number, toId: number) => Promise<void>;
}) {
	function handleDragStart(id: number, e: DragEvent) {
		if (opts.getReordering()) return;
		opts.setDraggingId(id);
		opts.setDragOverId(null);
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			try {
				e.dataTransfer.setData('text/plain', String(id));
			} catch {}
		}
	}

	function handleDragEnd() {
		opts.setDraggingId(null);
		opts.setDragOverId(null);
	}

	function handleDragOver(overId: number, e: DragEvent) {
		if (opts.getReordering()) return;
		if (opts.getDraggingId() == null) return;
		e.preventDefault();
		opts.setDragOverId(overId);
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
	}

	async function handleDrop(overId: number, e: DragEvent) {
		if (opts.getReordering()) return;
		e.preventDefault();
		const fromId = opts.getDraggingId();
		handleDragEnd();
		if (fromId == null) return;
		await opts.reorderByIds(fromId, overId);
	}

	async function handleHandleKeydown(id: number, e: KeyboardEvent) {
		if (opts.getReordering()) return;
		if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
		e.preventDefault();

		const ids = opts.getOrderedIds();
		const index = ids.indexOf(id);
		if (index === -1) return;
		const nextIndex = e.key === 'ArrowUp' ? index - 1 : index + 1;
		if (nextIndex < 0 || nextIndex >= ids.length) return;
		await opts.reorderByIds(id, ids[nextIndex]);
	}

	return {
		handleDragStart,
		handleDragEnd,
		handleDragOver,
		handleDrop,
		handleHandleKeydown
	};
}
