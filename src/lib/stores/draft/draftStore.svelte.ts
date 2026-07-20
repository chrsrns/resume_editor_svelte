/**
 * Reactive shell for the generic draft store factories.
 *
 * Wraps the pure `createDraftListStore` and `createChildGroupStore` cores in
 * Svelte 5 `$state` so changes are visible to components and derived values.
 */

import {
    createDraftListStore as createListCore,
    createChildGroupStore as createChildCore,
    createDraftItemStore as createItemCore,
    type DraftListStore,
    type DraftListStoreConfig,
    type DraftListState,
    type ChildGroupStore,
    type ChildGroupStoreConfig,
    type ChildGroupState,
    type DraftItemStore,
    type DraftItemStoreConfig,
    type DraftItemState
} from './draftStore';

export type {
    DraftAction,
    DraftListStore,
    DraftListStoreConfig,
    DraftListState,
    ChildGroupStore,
    ChildGroupStoreConfig,
    ChildGroupState,
    DraftItemStore,
    DraftItemStoreConfig,
    DraftItemState
} from './draftStore';

export function createDraftListStore<
    TDraft extends { id: number; display_order: string },
    TBaseline extends { id: number; display_order: number | null }
>(config: DraftListStoreConfig<TDraft, TBaseline>): DraftListStore<TDraft, TBaseline> {
    const state = $state<DraftListState<TDraft, TBaseline>>({
        drafts: [],
        baseline: [],
        saving: false,
        error: null
    });

    return createListCore(state, config);
}

export function createChildGroupStore<
    TDraft extends { id: number; display_order: string },
    TBaseline extends { id: number; display_order: number | null },
    TParentIdField extends string
>(
    config: ChildGroupStoreConfig<TDraft, TBaseline, TParentIdField>
): ChildGroupStore<TDraft, TBaseline> {
    const state = $state<ChildGroupState<TDraft, TBaseline>>({
        draftsMap: {},
        baselineMap: {},
        baseline: []
    });

    return createChildCore(state, config);
}

export function createDraftItemStore<
    TDraft extends { id: number },
    TBaseline extends { id: number }
>(config: DraftItemStoreConfig<TDraft, TBaseline>): DraftItemStore<TDraft, TBaseline> {
    const state = $state<DraftItemState<TDraft, TBaseline>>({
        draft: null,
        baseline: null,
        saving: false,
        error: null
    });

    return createItemCore(state, config);
}
