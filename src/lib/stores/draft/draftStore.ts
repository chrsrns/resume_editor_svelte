/**
 * Generic draft list store factory (pure core).
 *
 * Encapsulates the common lifecycle of a top-level draft list:
 * initialize, add, update, remove, reorder, validate, dirty detection,
 * diff computation, save-result application, and baseline commit.
 *
 * Section-specific stores configure transformation, validation, and payload
 * building. The reactive shell (Svelte $state) lives in `draftStore.svelte.ts`.
 */

import {
    type DraftItem,
    type DraftStatus,
    generateTempId,
    computeSignature,
    setValidationError,
    toNumberOrNull
} from './shared';

export interface DraftAction {
    type: string;
    tempId?: number;
    id?: number;
    payload?: unknown;
    [key: string]: unknown;
}

export interface DraftListState<
    TDraft extends { id: number; display_order: string },
    TBaseline extends { id: number; display_order: number | null }
> {
    drafts: DraftItem<TDraft>[];
    baseline: TBaseline[];
    saving: boolean;
    error: string | null;
}

export interface DraftListStoreConfig<
    TDraft extends { id: number; display_order: string },
    TBaseline extends { id: number; display_order: number | null }
> {
    /** Convert a server baseline item into a draft shape. */
    toDraft: (baseline: TBaseline) => TDraft;

    /** Convert a draft back into a baseline shape. `existing` is the prior baseline for this id. */
    toBaseline: (
        draft: TDraft,
        existing?: TBaseline,
        defaultMeta?: { resume_id: number; created_at: string }
    ) => TBaseline;

    /** Return a normalized object for dirty-detection signature of a draft. */
    normalizeDraft: (draft: TDraft) => Record<string, unknown>;

    /** Return a normalized object for dirty-detection signature of a baseline. */
    normalizeBaseline: (baseline: TBaseline) => Record<string, unknown>;

    /** Validate a draft. Return `null` if valid, otherwise an error message. */
    validate: (draft: TDraft) => string | null;

    /** Whether to validate a draft immediately when it is added. Defaults to `false`. */
    validateOnAdd?: boolean;

    /** Build the create payload for a new draft. */
    buildCreatePayload: (draft: TDraft) => unknown;

    /** Build the update payload, or `undefined` if nothing changed. */
    buildUpdatePayload: (draft: TDraft, baseline: TBaseline) => Record<string, unknown> | undefined;

    /** Action type names used by the save orchestrator. */
    actionType: { create: string; update: string; delete: string };

    /** Extract metadata from a baseline item for fallback values in `toBaseline`. */
    getMeta?: (baseline: TBaseline) => { resume_id: number; created_at: string };
}

export interface DraftListStore<
    TDraft extends { id: number; display_order: string },
    TBaseline extends { id: number; display_order: number | null }
> {
    initialize(data: TBaseline[]): void;
    getDrafts(): DraftItem<TDraft>[];
    getVisibleDrafts(): DraftItem<TDraft>[];
    getBaseline(): TBaseline[];
    add(draft: Omit<TDraft, 'id' | 'display_order'>): number;
    update(id: number, partial: Partial<TDraft>): void;
    remove(id: number): void;
    reorder(fromId: number, toId: number): void;
    validate(id: number): boolean;
    validateAll(): boolean;
    getValidationErrors(): string[];
    isDirty(): boolean;
    resetToBaseline(): void;
    computeDiff(): DraftAction[];
    applySaveResults(tempIdMap: Map<number, number>): void;
    commitBaseline(): void;
    setSaving(value: boolean): void;
    getSaving(): boolean;
    setError(value: string | null): void;
    getError(): string | null;
}

function byDisplayOrder(
    a: { display_order: number | null; id: number },
    b: { display_order: number | null; id: number }
) {
    const ao = a.display_order ?? Number.POSITIVE_INFINITY;
    const bo = b.display_order ?? Number.POSITIVE_INFINITY;
    if (ao !== bo) return ao - bo;
    return a.id - b.id;
}

export function createDraftListStore<
    TDraft extends { id: number; display_order: string },
    TBaseline extends { id: number; display_order: number | null }
>(
    state: DraftListState<TDraft, TBaseline>,
    config: DraftListStoreConfig<TDraft, TBaseline>
): DraftListStore<TDraft, TBaseline> {
    function getVisibleDrafts(): DraftItem<TDraft>[] {
        return state.drafts.filter((d) => d._status !== 'deleted');
    }

    function initialize(data: TBaseline[]): void {
        state.baseline = [...data].sort(byDisplayOrder);
        state.drafts = state.baseline.map((b) => ({
            ...config.toDraft(b),
            _status: 'existing' as DraftStatus
        }));
    }

    function getDrafts(): DraftItem<TDraft>[] {
        return state.drafts;
    }

    function getBaseline(): TBaseline[] {
        return state.baseline;
    }

    function add(draft: Omit<TDraft, 'id' | 'display_order'>): number {
        const visible = getVisibleDrafts();
        const maxOrder = visible.reduce((max, d) => {
            const order = toNumberOrNull(d.display_order) ?? 0;
            return order > max ? order : max;
        }, 0);
        const nextOrder = String(maxOrder + 10);
        const nextId = generateTempId();

        const newDraft = {
            ...(draft as TDraft),
            id: nextId,
            display_order: nextOrder,
            _status: 'new' as DraftStatus
        };

        state.drafts = [...state.drafts, newDraft];
        if (config.validateOnAdd) {
            validate(nextId);
        }
        return nextId;
    }

    function update(id: number, partial: Partial<TDraft>): void {
        state.drafts = state.drafts.map((d) => (d.id === id ? { ...d, ...partial } : d));
    }

    function remove(id: number): void {
        state.drafts = state.drafts.map((d) =>
            d.id === id
                ? (setValidationError(
                      { ...d, _status: 'deleted' as DraftStatus },
                      null
                  ) as DraftItem<TDraft>)
                : d
        );
    }

    function reorder(fromId: number, toId: number): void {
        const visible = getVisibleDrafts();
        const fromIndex = visible.findIndex((d) => d.id === fromId);
        const toIndex = visible.findIndex((d) => d.id === toId);
        if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
            return;
        }

        const reordered = [...visible];
        const [item] = reordered.splice(fromIndex, 1);
        reordered.splice(toIndex, 0, item);

        const updated = reordered.map((d, i) => ({
            ...d,
            display_order: String((i + 1) * 10)
        }));

        const deleted = state.drafts.filter((d) => d._status === 'deleted');
        state.drafts = [...updated, ...deleted];
    }

    function validate(id: number): boolean {
        const draft = state.drafts.find((d) => d.id === id);
        if (!draft) return false;

        const message = config.validate(draft);
        state.drafts = state.drafts.map((d) =>
            d.id === id ? (setValidationError(d, message) as DraftItem<TDraft>) : d
        );
        return message === null;
    }

    function validateAll(): boolean {
        let valid = true;
        for (const draft of getVisibleDrafts()) {
            if (!validate(draft.id)) {
                valid = false;
            }
        }
        return valid;
    }

    function getValidationErrors(): string[] {
        return state.drafts.filter((d) => d._validationError).map((d) => d._validationError!);
    }

    function isDirty(): boolean {
        const baselineSig = computeSignature(
            state.baseline
                .map((b) => ({
                    ...config.normalizeBaseline(b),
                    id: b.id,
                    display_order: b.display_order ?? null
                }))
                .sort(byDisplayOrder)
        );

        const draftSig = computeSignature(
            getVisibleDrafts()
                .map((d) => {
                    const normalized = config.normalizeDraft(d);
                    return {
                        ...normalized,
                        id: d.id,
                        display_order: toNumberOrNull(d.display_order) ?? null
                    };
                })
                .sort(byDisplayOrder)
        );

        return baselineSig !== draftSig || state.drafts.some((d) => d._status === 'new');
    }

    function resetToBaseline(): void {
        initialize(state.baseline);
        state.error = null;
    }

    function computeDiff(): DraftAction[] {
        const actions: DraftAction[] = [];

        for (const draft of state.drafts) {
            if (draft._status === 'new') {
                actions.push({
                    type: config.actionType.create,
                    tempId: draft.id,
                    payload: config.buildCreatePayload(draft)
                });
            } else if (draft._status === 'deleted') {
                if (draft.id < 0) continue;
                actions.push({ type: config.actionType.delete, id: draft.id });
            } else if (draft._status === 'existing') {
                const base = state.baseline.find((b) => b.id === draft.id);
                if (!base) continue;

                const payload = config.buildUpdatePayload(draft, base);
                if (payload && Object.keys(payload).length > 0) {
                    actions.push({
                        type: config.actionType.update,
                        id: draft.id,
                        payload
                    });
                }
            }
        }

        return actions;
    }

    function applySaveResults(tempIdMap: Map<number, number>): void {
        state.drafts = state.drafts
            .map((d) => {
                if (d._status === 'new' && tempIdMap.has(d.id)) {
                    return {
                        ...d,
                        id: tempIdMap.get(d.id)!,
                        _status: 'existing' as DraftStatus
                    };
                }
                if (d._status === 'deleted') {
                    return null;
                }
                return d;
            })
            .filter((d): d is DraftItem<TDraft> => d !== null);
    }

    function commitBaseline(): void {
        const baselineMap = new Map(state.baseline.map((b) => [b.id, b]));
        const defaultMeta: { resume_id: number; created_at: string } =
            state.baseline.length > 0 && config.getMeta
                ? config.getMeta(state.baseline[0])
                : { resume_id: 0, created_at: '' };

        state.baseline = state.drafts
            .filter((d) => d._status === 'existing')
            .map((d) => config.toBaseline(d, baselineMap.get(d.id), defaultMeta));
    }

    function setSaving(value: boolean): void {
        state.saving = value;
    }

    function getSaving(): boolean {
        return state.saving;
    }

    function setError(value: string | null): void {
        state.error = value;
    }

    function getError(): string | null {
        return state.error;
    }

    return {
        initialize,
        getDrafts,
        getVisibleDrafts,
        getBaseline,
        add,
        update,
        remove,
        reorder,
        validate,
        validateAll,
        getValidationErrors,
        isDirty,
        resetToBaseline,
        computeDiff,
        applySaveResults,
        commitBaseline,
        setSaving,
        getSaving,
        setError,
        getError
    };
}

export interface ChildGroupState<
    TDraft extends { id: number; display_order: string },
    TBaseline extends { id: number; display_order: number | null }
> {
    draftsMap: Record<number, DraftItem<TDraft>[]>;
    baselineMap: Record<number, TBaseline[]>;
    baseline: TBaseline[];
}

export interface ChildGroupStoreConfig<
    TDraft extends { id: number; display_order: string },
    TBaseline extends { id: number; display_order: number | null },
    TParentIdField extends string
> {
    toDraft: (baseline: TBaseline) => TDraft;
    toBaseline: (
        draft: TDraft,
        parentId: number,
        existing?: TBaseline,
        defaultMeta?: { created_at: string }
    ) => TBaseline;
    normalizeDraft: (draft: TDraft) => Record<string, unknown>;
    normalizeBaseline: (baseline: TBaseline) => Record<string, unknown>;
    validate: (draft: TDraft) => string | null;

    /** Whether to validate a child immediately when it is added. Defaults to `false`. */
    validateOnAdd?: boolean;

    buildCreatePayload: (draft: TDraft) => unknown;
    buildUpdatePayload: (draft: TDraft, baseline: TBaseline) => Record<string, unknown> | undefined;
    actionType: { create: string; update: string; delete: string };
    getParentId: (baseline: TBaseline) => number;
    parentIdField: TParentIdField;
    getMeta?: (baseline: TBaseline) => { created_at: string };
}

export interface ChildGroupStore<
    TDraft extends { id: number; display_order: string },
    TBaseline extends { id: number; display_order: number | null }
> {
    initialize(data: TBaseline[]): void;
    addGroup(parentId: number): void;
    removeGroup(parentId: number): void;
    getChildren(parentId: number): DraftItem<TDraft>[];
    getVisibleChildren(parentId: number): DraftItem<TDraft>[];
    addChild(parentId: number, draft: Omit<TDraft, 'id' | 'display_order'>): void;
    updateChild(id: number, partial: Partial<TDraft>): void;
    removeChild(id: number): void;
    removeAllInGroup(parentId: number): void;
    reorderChildren(parentId: number, fromId: number, toId: number): void;
    validateChild(id: number): boolean;
    validateAll(): boolean;
    getValidationErrors(): string[];
    isDirty(): boolean;
    resetToBaseline(): void;
    computeDiff(): DraftAction[];
    applySaveResults(tempIdMap: Map<number, number>): void;
    commitBaseline(): void;
    getBaseline(): TBaseline[];
}

export function createChildGroupStore<
    TDraft extends { id: number; display_order: string },
    TBaseline extends { id: number; display_order: number | null },
    TParentIdField extends string
>(
    state: ChildGroupState<TDraft, TBaseline>,
    config: ChildGroupStoreConfig<TDraft, TBaseline, TParentIdField>
): ChildGroupStore<TDraft, TBaseline> {
    function getGroup(parentId: number): DraftItem<TDraft>[] {
        return state.draftsMap[parentId] ?? [];
    }

    function getChildren(parentId: number): DraftItem<TDraft>[] {
        return getGroup(parentId);
    }

    function getVisibleChildren(parentId: number): DraftItem<TDraft>[] {
        return getGroup(parentId).filter((d) => d._status !== 'deleted');
    }

    function initialize(data: TBaseline[]): void {
        state.baseline = [...data];
        state.baselineMap = {};
        state.draftsMap = {};

        for (const item of data) {
            const parentId = config.getParentId(item);
            if (!state.baselineMap[parentId]) {
                state.baselineMap[parentId] = [];
                state.draftsMap[parentId] = [];
            }
            state.baselineMap[parentId].push(item);
        }

        for (const parentId of Object.keys(state.baselineMap)) {
            const numParentId = Number(parentId);
            state.baselineMap[numParentId] = state.baselineMap[numParentId]
                .sort(byDisplayOrder)
                .map((b) => ({ ...b }));
            state.draftsMap[numParentId] = state.baselineMap[numParentId].map((b) => ({
                ...config.toDraft(b),
                _status: 'existing' as DraftStatus
            }));
        }
    }

    function addGroup(parentId: number): void {
        if (!state.draftsMap[parentId]) {
            state.draftsMap[parentId] = [];
        }
    }

    function removeGroup(parentId: number): void {
        const next = { ...state.draftsMap };
        delete next[parentId];
        state.draftsMap = next;

        const nextBaseline = { ...state.baselineMap };
        delete nextBaseline[parentId];
        state.baselineMap = nextBaseline;
    }

    function addChild(parentId: number, draft: Omit<TDraft, 'id' | 'display_order'>): void {
        if (!state.draftsMap[parentId]) {
            state.draftsMap[parentId] = [];
        }
        const nextId = generateTempId();
        const newDraft: DraftItem<TDraft> = {
            ...(draft as TDraft),
            id: nextId,
            display_order: '',
            _status: 'new' as DraftStatus
        };
        state.draftsMap[parentId] = [...state.draftsMap[parentId], newDraft];
        if (config.validateOnAdd) {
            validateChild(nextId);
        }
    }

    function findChild(
        id: number
    ): { parentId: number; index: number; draft: DraftItem<TDraft> } | null {
        for (const parentId of Object.keys(state.draftsMap)) {
            const numParentId = Number(parentId);
            const group = state.draftsMap[numParentId];
            const index = group.findIndex((d) => d.id === id);
            if (index !== -1) {
                return { parentId: numParentId, index, draft: group[index] };
            }
        }
        return null;
    }

    function updateChild(id: number, partial: Partial<TDraft>): void {
        const found = findChild(id);
        if (!found) return;
        const { parentId, index } = found;
        state.draftsMap[parentId] = state.draftsMap[parentId].map((d, i) =>
            i === index ? { ...d, ...partial } : d
        );
    }

    function removeChild(id: number): void {
        const found = findChild(id);
        if (!found) return;
        const { parentId, index, draft } = found;
        if (draft.id < 0) {
            // New-then-deleted: remove entirely
            state.draftsMap[parentId] = state.draftsMap[parentId].filter((d) => d.id !== id);
            return;
        }
        state.draftsMap[parentId] = state.draftsMap[parentId].map((d, i) =>
            i === index
                ? (setValidationError(
                      { ...d, _status: 'deleted' as DraftStatus },
                      null
                  ) as DraftItem<TDraft>)
                : d
        );
    }

    function removeAllInGroup(parentId: number): void {
        const group = state.draftsMap[parentId];
        if (!group) return;
        state.draftsMap[parentId] = group
            .map((d) =>
                d.id < 0
                    ? null
                    : (setValidationError(
                          { ...d, _status: 'deleted' as DraftStatus },
                          null
                      ) as DraftItem<TDraft>)
            )
            .filter((d): d is DraftItem<TDraft> => d !== null);
    }

    function reorderChildren(parentId: number, fromId: number, toId: number): void {
        const visible = getVisibleChildren(parentId);
        const fromIndex = visible.findIndex((d) => d.id === fromId);
        const toIndex = visible.findIndex((d) => d.id === toId);
        if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

        const reordered = [...visible];
        const [item] = reordered.splice(fromIndex, 1);
        reordered.splice(toIndex, 0, item);

        const updated = reordered.map((d, i) => ({
            ...d,
            display_order: String((i + 1) * 10)
        }));

        const deleted = (state.draftsMap[parentId] ?? []).filter((d) => d._status === 'deleted');
        state.draftsMap[parentId] = [...updated, ...deleted];
    }

    function validateChild(id: number): boolean {
        const found = findChild(id);
        if (!found) return false;
        const { parentId, index, draft } = found;
        const message = config.validate(draft);
        state.draftsMap[parentId] = state.draftsMap[parentId].map((d, i) =>
            i === index ? (setValidationError(d, message) as DraftItem<TDraft>) : d
        );
        return message === null;
    }

    function validateAll(): boolean {
        let valid = true;
        for (const parentId of Object.keys(state.draftsMap)) {
            for (const child of getVisibleChildren(Number(parentId))) {
                if (!validateChild(child.id)) {
                    valid = false;
                }
            }
        }
        return valid;
    }

    function getValidationErrors(): string[] {
        const errors: string[] = [];
        for (const parentId of Object.keys(state.draftsMap)) {
            for (const child of state.draftsMap[Number(parentId)]) {
                if (child._validationError) {
                    errors.push(child._validationError);
                }
            }
        }
        return errors;
    }

    function isDirty(): boolean {
        const allParentIds = new Set([
            ...Object.keys(state.baselineMap).map(Number),
            ...Object.keys(state.draftsMap).map(Number)
        ]);

        for (const parentId of allParentIds) {
            const baselineGroup = (state.baselineMap[parentId] ?? [])
                .map((b) => ({
                    ...config.normalizeBaseline(b),
                    id: b.id,
                    display_order: b.display_order ?? null
                }))
                .sort(byDisplayOrder);
            const draftGroup = getVisibleChildren(parentId)
                .map((d) => ({
                    ...config.normalizeDraft(d),
                    id: d.id,
                    display_order: toNumberOrNull(d.display_order) ?? null
                }))
                .sort(byDisplayOrder);

            if (computeSignature(baselineGroup) !== computeSignature(draftGroup)) {
                return true;
            }
        }

        return false;
    }

    function resetToBaseline(): void {
        initialize(state.baseline);
    }

    function computeDiff(): DraftAction[] {
        const actions: DraftAction[] = [];

        for (const parentId of Object.keys(state.draftsMap)) {
            const numParentId = Number(parentId);
            const group = state.draftsMap[numParentId];
            const baselineGroup = state.baselineMap[numParentId] ?? [];

            for (const child of group) {
                if (child._status === 'new') {
                    const action: DraftAction = {
                        type: config.actionType.create,
                        tempId: child.id,
                        payload: config.buildCreatePayload(child)
                    };
                    action[config.parentIdField] = numParentId;
                    actions.push(action);
                } else if (child._status === 'deleted') {
                    if (child.id < 0) continue;
                    actions.push({ type: config.actionType.delete, id: child.id });
                } else if (child._status === 'existing') {
                    const baseline = baselineGroup.find((b) => b.id === child.id);
                    if (!baseline) continue;
                    const payload = config.buildUpdatePayload(child, baseline);
                    if (payload && Object.keys(payload).length > 0) {
                        actions.push({
                            type: config.actionType.update,
                            id: child.id,
                            payload
                        });
                    }
                }
            }
        }

        return actions;
    }

    function applySaveResults(tempIdMap: Map<number, number>): void {
        const nextDraftsMap: Record<number, DraftItem<TDraft>[]> = {};

        for (const parentId of Object.keys(state.draftsMap)) {
            const numParentId = Number(parentId);
            const realParentId = tempIdMap.get(numParentId) ?? numParentId;
            nextDraftsMap[realParentId] = (state.draftsMap[numParentId] ?? [])
                .map((d) => {
                    if (d._status === 'new' && tempIdMap.has(d.id)) {
                        return {
                            ...d,
                            id: tempIdMap.get(d.id)!,
                            _status: 'existing' as DraftStatus
                        };
                    }
                    if (d._status === 'deleted') {
                        return null;
                    }
                    return d;
                })
                .filter((d): d is DraftItem<TDraft> => d !== null);
        }

        state.draftsMap = nextDraftsMap;
    }

    function commitBaseline(): void {
        const defaultMeta: { created_at: string } =
            state.baseline.length > 0 && config.getMeta
                ? config.getMeta(state.baseline[0])
                : { created_at: '' };

        const nextBaseline: TBaseline[] = [];
        const nextBaselineMap: Record<number, TBaseline[]> = {};

        for (const parentId of Object.keys(state.draftsMap)) {
            const numParentId = Number(parentId);
            if (numParentId < 0) continue; // Parent not saved yet

            const baselineGroup = state.baselineMap[numParentId] ?? [];
            const visible = state.draftsMap[numParentId].filter((d) => d._status === 'existing');

            for (const child of visible) {
                const existing = baselineGroup.find((b) => b.id === child.id);
                const baseline = config.toBaseline(child, numParentId, existing, defaultMeta);
                nextBaseline.push(baseline);
                if (!nextBaselineMap[numParentId]) nextBaselineMap[numParentId] = [];
                nextBaselineMap[numParentId].push(baseline);
            }
        }

        state.baseline = nextBaseline;
        state.baselineMap = nextBaselineMap;
    }

    function getBaseline(): TBaseline[] {
        return state.baseline;
    }

    return {
        initialize,
        addGroup,
        removeGroup,
        getChildren,
        getVisibleChildren,
        addChild,
        updateChild,
        removeChild,
        removeAllInGroup,
        reorderChildren,
        validateChild,
        validateAll,
        getValidationErrors,
        isDirty,
        resetToBaseline,
        computeDiff,
        applySaveResults,
        commitBaseline,
        getBaseline
    };
}

export interface ParentChildSection<
    TPDraft extends { id: number; display_order: string },
    TPBaseline extends { id: number; display_order: number | null },
    TChildren extends Record<string, { label: string; store: ChildGroupStore<any, any> }>
> {
    parent: DraftListStore<TPDraft, TPBaseline>;
    children: { [K in keyof TChildren]: TChildren[K]['store'] };
    getDrafts(): DraftItem<TPDraft>[];
    getVisibleDrafts(): DraftItem<TPDraft>[];
    getBaseline(): TPBaseline[];
    initialize(
        parentData: TPBaseline[],
        childrenData: {
            [K in keyof TChildren]: TChildren[K] extends { store: ChildGroupStore<any, infer TB> }
                ? TB[]
                : never;
        }
    ): void;
    addParent(draft: Omit<TPDraft, 'id' | 'display_order'>): number;
    updateParent(id: number, partial: Partial<TPDraft>): void;
    removeParent(id: number): void;
    reorderParents(fromId: number, toId: number): void;
    validateParent(id: number): boolean;
    validateAll(): boolean;
    getValidationErrors(): string[];
    isDirty(): boolean;
    resetToBaseline(): void;
    applySaveResults(tempIdMap: Map<number, number>): void;
    commitBaseline(): void;
    computeDiff(): DraftAction[];
    getSaving(): boolean;
    setSaving(value: boolean): void;
    getError(): string | null;
    setError(value: string | null): void;
}

export function createParentChildSection<
    TPDraft extends { id: number; display_order: string },
    TPBaseline extends { id: number; display_order: number | null },
    TChildren extends Record<string, { label: string; store: ChildGroupStore<any, any> }>
>(
    parentStore: DraftListStore<TPDraft, TPBaseline>,
    children: TChildren,
    parentLabel: string
): ParentChildSection<TPDraft, TPBaseline, TChildren> {
    function getChildStores(): ChildGroupStore<any, any>[] {
        return (Object.values(children) as { label: string; store: ChildGroupStore<any, any> }[]).map(
            (c) => c.store
        );
    }

    function initialize(
        parentData: TPBaseline[],
        childrenData: {
            [K in keyof TChildren]: TChildren[K] extends { store: ChildGroupStore<any, infer TB> }
                ? TB[]
                : never;
        }
    ): void {
        parentStore.initialize(parentData);
        const dataMap = childrenData as unknown as Record<string, unknown[]>;
        for (const [key, child] of Object.entries(children) as [
            string,
            { label: string; store: ChildGroupStore<any, any> }
        ][]) {
            const data = dataMap[key] ?? [];
            child.store.initialize(data as any);
        }
    }

    function getDrafts(): DraftItem<TPDraft>[] {
        return parentStore.getDrafts();
    }

    function getVisibleDrafts(): DraftItem<TPDraft>[] {
        return parentStore.getVisibleDrafts();
    }

    function getBaseline(): TPBaseline[] {
        return parentStore.getBaseline();
    }

    function addParent(draft: Omit<TPDraft, 'id' | 'display_order'>): number {
        const id = parentStore.add(draft);
        for (const child of getChildStores()) {
            child.addGroup(id);
        }
        return id;
    }

    function removeParent(id: number): void {
        parentStore.remove(id);
        for (const child of getChildStores()) {
            if (id < 0) {
                child.removeGroup(id);
            } else {
                child.removeAllInGroup(id);
            }
        }
    }

    function updateParent(id: number, partial: Partial<TPDraft>): void {
        parentStore.update(id, partial);
    }

    function reorderParents(fromId: number, toId: number): void {
        parentStore.reorder(fromId, toId);
    }

    function validateParent(id: number): boolean {
        return parentStore.validate(id);
    }

    function validateAll(): boolean {
        let valid = parentStore.validateAll();
        for (const child of getChildStores()) {
            if (!child.validateAll()) {
                valid = false;
            }
        }
        return valid;
    }

    function getValidationErrors(): string[] {
        const errors: string[] = [];
        for (const error of parentStore.getValidationErrors()) {
            errors.push(`${parentLabel}: ${error}`);
        }
        for (const { label, store } of Object.values(children) as {
            label: string;
            store: ChildGroupStore<any, any>;
        }[]) {
            for (const error of store.getValidationErrors()) {
                errors.push(`${label}: ${error}`);
            }
        }
        return errors;
    }

    function isDirty(): boolean {
        if (parentStore.isDirty()) return true;
        for (const child of getChildStores()) {
            if (child.isDirty()) return true;
        }
        return false;
    }

    function resetToBaseline(): void {
        parentStore.resetToBaseline();
        for (const child of getChildStores()) {
            child.resetToBaseline();
        }
    }

    function applySaveResults(tempIdMap: Map<number, number>): void {
        parentStore.applySaveResults(tempIdMap);
        for (const child of getChildStores()) {
            child.applySaveResults(tempIdMap);
        }
    }

    function commitBaseline(): void {
        parentStore.commitBaseline();
        for (const child of getChildStores()) {
            child.commitBaseline();
        }
    }

    function computeDiff(): DraftAction[] {
        const actions: DraftAction[] = [];
        actions.push(...parentStore.computeDiff());
        for (const child of getChildStores()) {
            actions.push(...child.computeDiff());
        }
        return actions;
    }

    function getSaving(): boolean {
        return parentStore.getSaving();
    }

    function setSaving(value: boolean): void {
        parentStore.setSaving(value);
    }

    function getError(): string | null {
        return parentStore.getError();
    }

    function setError(value: string | null): void {
        parentStore.setError(value);
    }

    const childStores = {} as { [K in keyof TChildren]: TChildren[K]['store'] };
    for (const key of Object.keys(children)) {
        (childStores as any)[key] = (children as any)[key].store;
    }

    return {
        parent: parentStore,
        children: childStores,
        getDrafts,
        getVisibleDrafts,
        getBaseline,
        initialize,
        addParent,
        updateParent,
        removeParent,
        reorderParents,
        validateParent,
        validateAll,
        getValidationErrors,
        isDirty,
        resetToBaseline,
        applySaveResults,
        commitBaseline,
        computeDiff,
        getSaving,
        setSaving,
        getError,
        setError
    };
}

export interface DraftItemState<TDraft extends { id: number }, TBaseline extends { id: number }> {
    draft: DraftItem<TDraft> | null;
    baseline: TBaseline | null;
    saving: boolean;
    error: string | null;
}

export interface DraftItemStoreConfig<
    TDraft extends { id: number },
    TBaseline extends { id: number }
> {
    /** Convert a server baseline into a draft shape. */
    toDraft: (baseline: TBaseline) => TDraft;

    /** Convert a draft back into a baseline shape. `existing` is the prior baseline. */
    toBaseline: (draft: TDraft, existing?: TBaseline) => TBaseline;

    /** Return a normalized object for dirty-detection signature of a draft. */
    normalizeDraft: (draft: TDraft) => Record<string, unknown>;

    /** Return a normalized object for dirty-detection signature of a baseline. */
    normalizeBaseline: (baseline: TBaseline) => Record<string, unknown>;

    /** Validate a draft. Return `null` if valid, otherwise an error message. */
    validate: (draft: TDraft) => string | null;

    /** Build the payload sent to the server when saving. */
    buildPayload: (draft: TDraft) => unknown;
}

export interface DraftItemStore<TDraft extends { id: number }, TBaseline extends { id: number }> {
    initialize(baseline: TBaseline): void;
    getDraft(): DraftItem<TDraft>;
    getField<K extends keyof TDraft>(field: K): TDraft[K];
    update(partial: Partial<TDraft>): void;
    validate(): boolean;
    getValidationError(): string | null;
    isDirty(): boolean;
    resetToBaseline(): void;
    buildPayload(): unknown;
    commitBaseline(): void;
    setSaving(value: boolean): void;
    getSaving(): boolean;
    setError(value: string | null): void;
    getError(): string | null;
}

export function createDraftItemStore<
    TDraft extends { id: number },
    TBaseline extends { id: number }
>(
    state: DraftItemState<TDraft, TBaseline>,
    config: DraftItemStoreConfig<TDraft, TBaseline>
): DraftItemStore<TDraft, TBaseline> {
    function initialize(baseline: TBaseline): void {
        state.baseline = { ...baseline };
        state.draft = {
            ...config.toDraft(baseline),
            _status: 'existing' as DraftStatus
        };
    }

    function getDraft(): DraftItem<TDraft> {
        return state.draft!;
    }

    function getField<K extends keyof TDraft>(field: K): TDraft[K] {
        return state.draft![field];
    }

    function update(partial: Partial<TDraft>): void {
        if (!state.draft) return;
        state.draft = { ...state.draft, ...partial };
    }

    function validate(): boolean {
        if (!state.draft) return true;
        const message = config.validate(state.draft);
        state.draft = setValidationError(state.draft, message) as DraftItem<TDraft>;
        return message === null;
    }

    function getValidationError(): string | null {
        return state.draft?._validationError ?? null;
    }

    function isDirty(): boolean {
        if (!state.draft || !state.baseline) return false;
        const draftSig = computeSignature({
            id: state.draft.id,
            ...config.normalizeDraft(state.draft)
        });
        const baselineSig = computeSignature({
            id: state.baseline.id,
            ...config.normalizeBaseline(state.baseline)
        });
        return draftSig !== baselineSig;
    }

    function resetToBaseline(): void {
        if (state.baseline) {
            initialize(state.baseline);
        }
        state.error = null;
    }

    function buildPayload(): unknown {
        return config.buildPayload(state.draft!);
    }

    function commitBaseline(): void {
        if (!state.draft || !state.baseline) return;
        state.baseline = config.toBaseline(state.draft, state.baseline);
        state.draft = { ...state.draft, _status: 'existing' as DraftStatus };
    }

    function setSaving(value: boolean): void {
        state.saving = value;
    }

    function getSaving(): boolean {
        return state.saving;
    }

    function setError(value: string | null): void {
        state.error = value;
    }

    function getError(): string | null {
        return state.error;
    }

    return {
        initialize,
        getDraft,
        getField,
        update,
        validate,
        getValidationError,
        isDirty,
        resetToBaseline,
        buildPayload,
        commitBaseline,
        setSaving,
        getSaving,
        setError,
        getError
    };
}
