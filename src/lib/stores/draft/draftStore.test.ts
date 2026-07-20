import { describe, it, expect, beforeEach } from 'vitest';
import {
    createDraftListStore,
    createChildGroupStore,
    createDraftItemStore,
    type DraftListState,
    type ChildGroupState,
    type DraftItemState
} from './draftStore';
import { resetTempIdCounter, toNumberOrNull } from './shared';

type ItemBaseline = {
    id: number;
    resume_id: number;
    title: string;
    confidence: number;
    display_order: number | null;
    created_at: string;
};

type ItemDraft = {
    id: number;
    title: string;
    confidence: string;
    display_order: string;
};

function createStore() {
    const state: DraftListState<ItemDraft, ItemBaseline> = {
        drafts: [],
        baseline: [],
        saving: false,
        error: null
    };

    return {
        store: createDraftListStore<ItemDraft, ItemBaseline>(state, {
            toDraft: (b) => ({
                id: b.id,
                title: b.title,
                confidence: String(b.confidence),
                display_order: b.display_order == null ? '' : String(b.display_order)
            }),
            toBaseline: (d, existing, meta) => ({
                id: d.id,
                resume_id: existing?.resume_id ?? meta?.resume_id ?? 0,
                title: d.title.trim(),
                confidence: Number(d.confidence),
                display_order: toNumberOrNull(d.display_order),
                created_at: existing?.created_at ?? meta?.created_at ?? ''
            }),
            normalizeDraft: (d) => ({
                title: d.title.trim(),
                confidence: Number(d.confidence)
            }),
            normalizeBaseline: (b) => ({
                title: b.title,
                confidence: b.confidence
            }),
            validate: (d) => {
                if (!d.title.trim()) return 'Title is required';
                if (d.confidence.trim() === '') return 'Confidence is required';
                const c = Number(d.confidence);
                if (Number.isNaN(c) || c < 0 || c > 100) return 'Confidence must be 0–100';
                return null;
            },
            buildCreatePayload: (d) => ({
                title: d.title.trim(),
                confidence: Number(d.confidence),
                display_order: toNumberOrNull(d.display_order)
            }),
            buildUpdatePayload: (d, b) => {
                const payload: Partial<ItemBaseline> = {};
                if (d.title.trim() !== b.title) payload.title = d.title.trim();
                if (Number(d.confidence) !== b.confidence)
                    payload.confidence = Number(d.confidence);
                const order = toNumberOrNull(d.display_order);
                if (order !== b.display_order) payload.display_order = order;
                return payload;
            },
            actionType: { create: 'createItem', update: 'updateItem', delete: 'deleteItem' },
            validateOnAdd: true,
            getMeta: (b) => ({ resume_id: b.resume_id, created_at: b.created_at })
        }),
        state
    };
}

describe('createDraftListStore', () => {
    beforeEach(() => {
        resetTempIdCounter();
    });

    it('initializes drafts from baseline', () => {
        const { store } = createStore();
        store.initialize([
            {
                id: 1,
                resume_id: 10,
                title: 'A',
                confidence: 80,
                display_order: 1,
                created_at: 'c1'
            },
            { id: 2, resume_id: 10, title: 'B', confidence: 90, display_order: 2, created_at: 'c2' }
        ]);

        const visible = store.getVisibleDrafts();
        expect(visible).toHaveLength(2);
        expect(visible[0].id).toBe(1);
        expect(visible[0].confidence).toBe('80');
        expect(visible[0]._status).toBe('existing');
    });

    it('adds new drafts with temp ids and increasing display order', () => {
        const { store } = createStore();
        store.initialize([]);
        store.add({ title: 'A', confidence: '80' });
        store.add({ title: 'B', confidence: '90' });

        const visible = store.getVisibleDrafts();
        expect(visible).toHaveLength(2);
        expect(visible[0].id).toBe(-1);
        expect(visible[0].display_order).toBe('10');
        expect(visible[1].id).toBe(-2);
        expect(visible[1].display_order).toBe('20');
    });

    it('validates drafts and exposes errors', () => {
        const { store } = createStore();
        store.initialize([]);
        store.add({ title: '', confidence: '' });

        const errors = store.getValidationErrors();
        expect(errors).toContain('Title is required');
        expect(store.validateAll()).toBe(false);
    });

    it('updates drafts and detects dirty state', () => {
        const { store } = createStore();
        store.initialize([
            { id: 1, resume_id: 10, title: 'A', confidence: 80, display_order: 1, created_at: '' }
        ]);

        expect(store.isDirty()).toBe(false);
        store.update(1, { title: 'Updated' });
        expect(store.isDirty()).toBe(true);

        const draft = store.getVisibleDrafts()[0];
        expect(draft.title).toBe('Updated');
    });

    it('reorders visible drafts and recalculates display order', () => {
        const { store } = createStore();
        store.initialize([
            { id: 1, resume_id: 10, title: 'A', confidence: 80, display_order: 1, created_at: '' },
            { id: 2, resume_id: 10, title: 'B', confidence: 90, display_order: 2, created_at: '' }
        ]);

        store.reorder(1, 2);
        const visible = store.getVisibleDrafts();
        expect(visible[0].id).toBe(2);
        expect(visible[0].display_order).toBe('10');
        expect(visible[1].id).toBe(1);
        expect(visible[1].display_order).toBe('20');
    });

    it('marks drafts deleted and excludes them from visible and dirty state', () => {
        const { store } = createStore();
        store.initialize([
            { id: 1, resume_id: 10, title: 'A', confidence: 80, display_order: 1, created_at: '' }
        ]);

        store.remove(1);
        expect(store.getVisibleDrafts()).toHaveLength(0);
        expect(store.isDirty()).toBe(true);
    });

    it('computes create, update, and delete actions', () => {
        const { store } = createStore();
        store.initialize([
            { id: 1, resume_id: 10, title: 'A', confidence: 80, display_order: 1, created_at: '' }
        ]);

        store.add({ title: 'B', confidence: '90' });
        store.update(1, { title: 'Updated' });

        const actions = store.computeDiff();
        expect(actions).toHaveLength(2);
        expect(actions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ type: 'createItem', tempId: -1 }),
                expect.objectContaining({
                    type: 'updateItem',
                    id: 1,
                    payload: { title: 'Updated' }
                })
            ])
        );
    });

    it('skips delete action for new-then-deleted drafts', () => {
        const { store } = createStore();
        store.initialize([]);
        store.add({ title: 'B', confidence: '90' });
        store.remove(-1);

        const actions = store.computeDiff();
        expect(actions).toHaveLength(0);
        expect(store.getVisibleDrafts()).toHaveLength(0);
        expect(store.isDirty()).toBe(false);
    });

    it('applies save results and commits baseline', () => {
        const { store } = createStore();
        store.initialize([]);
        store.add({ title: 'B', confidence: '90' });

        const actions = store.computeDiff();
        expect(actions[0].type).toBe('createItem');

        store.applySaveResults(new Map([[-1, 101]]));
        store.commitBaseline();

        const baseline = store.getBaseline();
        expect(baseline).toHaveLength(1);
        expect(baseline[0].id).toBe(101);
        expect(baseline[0].title).toBe('B');
        expect(store.isDirty()).toBe(false);
    });

    it('resets to baseline', () => {
        const { store } = createStore();
        store.initialize([
            { id: 1, resume_id: 10, title: 'A', confidence: 80, display_order: 1, created_at: '' }
        ]);
        store.update(1, { title: 'Changed' });
        expect(store.isDirty()).toBe(true);

        store.resetToBaseline();
        expect(store.isDirty()).toBe(false);
        expect(store.getVisibleDrafts()[0].title).toBe('A');
    });

    it('maintains metadata when committing baseline for new items', () => {
        const { store } = createStore();
        store.initialize([
            { id: 1, resume_id: 42, title: 'A', confidence: 80, display_order: 1, created_at: 'c1' }
        ]);
        store.add({ title: 'B', confidence: '90' });

        store.applySaveResults(new Map([[-1, 2]]));
        store.commitBaseline();

        const baseline = store.getBaseline();
        const newBaseline = baseline.find((b) => b.id === 2);
        expect(newBaseline).toBeDefined();
        expect(newBaseline!.resume_id).toBe(42);
    });
});

describe('createChildGroupStore', () => {
    type CommentBaseline = {
        id: number;
        post_id: number;
        text: string;
        display_order: number | null;
        created_at: string;
    };

    type CommentDraft = {
        id: number;
        text: string;
        display_order: string;
    };

    function createChildStore() {
        const state: ChildGroupState<CommentDraft, CommentBaseline> = {
            draftsMap: {},
            baselineMap: {},
            baseline: []
        };

        return {
            store: createChildGroupStore<CommentDraft, CommentBaseline, 'postId'>(state, {
                toDraft: (b) => ({
                    id: b.id,
                    text: b.text,
                    display_order: b.display_order == null ? '' : String(b.display_order)
                }),
                toBaseline: (d, postId, existing, meta) => ({
                    id: d.id,
                    post_id: postId,
                    text: d.text.trim(),
                    display_order: toNumberOrNull(d.display_order),
                    created_at: existing?.created_at ?? meta?.created_at ?? ''
                }),
                normalizeDraft: (d) => ({ text: d.text.trim() }),
                normalizeBaseline: (b) => ({ text: b.text }),
                validate: (d) => {
                    if (!d.text.trim()) return 'Text is required';
                    return null;
                },
                buildCreatePayload: (d) => ({ text: d.text.trim() }),
                buildUpdatePayload: (d, b) => {
                    const payload: Partial<CommentBaseline> = {};
                    if (d.text.trim() !== b.text) payload.text = d.text.trim();
                    return payload;
                },
                actionType: {
                    create: 'createComment',
                    update: 'updateComment',
                    delete: 'deleteComment'
                },
                getParentId: (b) => b.post_id,
                parentIdField: 'postId',
                getMeta: (b) => ({ created_at: b.created_at })
            }),
            state
        };
    }

    beforeEach(() => {
        resetTempIdCounter();
    });

    it('initializes children grouped by parent', () => {
        const { store } = createChildStore();
        store.initialize([
            { id: 1, post_id: 10, text: 'A', display_order: 1, created_at: 'c1' },
            { id: 2, post_id: 10, text: 'B', display_order: 2, created_at: 'c2' },
            { id: 3, post_id: 20, text: 'C', display_order: 1, created_at: 'c3' }
        ]);

        expect(store.getChildren(10)).toHaveLength(2);
        expect(store.getVisibleChildren(20)[0].text).toBe('C');
    });

    it('adds a child under a parent and computes create action', () => {
        const { store } = createChildStore();
        store.initialize([]);
        store.addGroup(10);
        store.addChild(10, { text: 'New' });

        const actions = store.computeDiff();
        expect(actions).toHaveLength(1);
        expect(actions[0]).toMatchObject({
            type: 'createComment',
            postId: 10,
            tempId: -1,
            payload: { text: 'New' }
        });
    });

    it('updates and deletes children and detects dirty state', () => {
        const { store } = createChildStore();
        store.initialize([{ id: 1, post_id: 10, text: 'A', display_order: 1, created_at: '' }]);

        expect(store.isDirty()).toBe(false);
        store.updateChild(1, { text: 'Updated' });
        expect(store.isDirty()).toBe(true);

        store.removeChild(1);
        expect(store.getVisibleChildren(10)).toHaveLength(0);
    });

    it('reorders children within a parent', () => {
        const { store } = createChildStore();
        store.initialize([
            { id: 1, post_id: 10, text: 'A', display_order: 1, created_at: '' },
            { id: 2, post_id: 10, text: 'B', display_order: 2, created_at: '' }
        ]);

        store.reorderChildren(10, 1, 2);
        const visible = store.getVisibleChildren(10);
        expect(visible[0].id).toBe(2);
        expect(visible[0].display_order).toBe('10');
        expect(visible[1].display_order).toBe('20');
    });

    it('skips new-then-deleted children in diff', () => {
        const { store } = createChildStore();
        store.initialize([]);
        store.addGroup(10);
        store.addChild(10, { text: 'X' });
        store.removeChild(-1);

        expect(store.computeDiff()).toHaveLength(0);
        expect(store.getVisibleChildren(10)).toHaveLength(0);
        expect(store.isDirty()).toBe(false);
    });

    it('applies save results and updates parent keys', () => {
        const { store } = createChildStore();
        store.initialize([]);
        store.addGroup(-2);
        store.addChild(-2, { text: 'New' });

        store.applySaveResults(
            new Map([
                [-2, 20],
                [-1, 101]
            ])
        );
        store.commitBaseline();

        expect(store.getVisibleChildren(20)).toHaveLength(1);
        expect(store.getVisibleChildren(20)[0].id).toBe(101);
        expect(store.getBaseline()[0].post_id).toBe(20);
    });

    it('removes all children when parent group is removed', () => {
        const { store } = createChildStore();
        store.initialize([{ id: 1, post_id: 10, text: 'A', display_order: 1, created_at: '' }]);

        store.removeAllInGroup(10);
        expect(store.getVisibleChildren(10)).toHaveLength(0);
        expect(store.isDirty()).toBe(true);
        expect(store.computeDiff()[0]).toMatchObject({ type: 'deleteComment', id: 1 });
    });
});

describe('createDraftItemStore', () => {
    type ProfileDraft = {
        id: number;
        name: string;
        email: string;
        is_public: boolean;
    };

    type ProfileBaseline = {
        id: number;
        name: string;
        email: string;
        is_public: boolean;
    };

    function createItemStore() {
        const state: DraftItemState<ProfileDraft, ProfileBaseline> = {
            draft: null,
            baseline: null,
            saving: false,
            error: null
        };

        return {
            store: createDraftItemStore<ProfileDraft, ProfileBaseline>(state, {
                toDraft: (b) => ({ ...b }),
                toBaseline: (d) => ({
                    id: d.id,
                    name: d.name.trim(),
                    email: d.email.trim(),
                    is_public: d.is_public
                }),
                normalizeDraft: (d) => ({
                    name: d.name.trim(),
                    email: d.email.trim(),
                    is_public: d.is_public
                }),
                normalizeBaseline: (b) => ({
                    name: b.name,
                    email: b.email,
                    is_public: b.is_public
                }),
                validate: (d) => {
                    if (!d.name.trim()) return 'Name is required';
                    if (!d.email.trim()) return 'Email is required';
                    return null;
                },
                buildPayload: (d) => ({
                    name: d.name.trim(),
                    email: d.email.trim(),
                    is_public: d.is_public
                })
            }),
            state
        };
    }

    it('initializes from baseline', () => {
        const { store } = createItemStore();
        store.initialize({ id: 1, name: 'A', email: 'a@b.com', is_public: true });

        const draft = store.getDraft();
        expect(draft.name).toBe('A');
        expect(draft._status).toBe('existing');
        expect(store.isDirty()).toBe(false);
    });

    it('detects dirty changes', () => {
        const { store } = createItemStore();
        store.initialize({ id: 1, name: 'A', email: 'a@b.com', is_public: true });

        store.update({ name: 'B' });
        expect(store.isDirty()).toBe(true);
    });

    it('validates and exposes errors', () => {
        const { store } = createItemStore();
        store.initialize({ id: 1, name: 'A', email: 'a@b.com', is_public: true });

        store.update({ name: '', email: '' });
        expect(store.validate()).toBe(false);
        expect(store.getValidationError()).toBe('Name is required');
    });

    it('builds payload and commits baseline', () => {
        const { store } = createItemStore();
        store.initialize({ id: 1, name: ' A ', email: 'a@b.com', is_public: true });

        store.update({ name: '  B  ' });
        const payload = store.buildPayload();
        expect(payload).toEqual({ name: 'B', email: 'a@b.com', is_public: true });

        store.commitBaseline();
        expect(store.isDirty()).toBe(false);
    });

    it('resets to baseline', () => {
        const { store } = createItemStore();
        store.initialize({ id: 1, name: 'A', email: 'a@b.com', is_public: true });

        store.update({ name: 'B' });
        store.resetToBaseline();

        expect(store.getDraft().name).toBe('A');
        expect(store.isDirty()).toBe(false);
    });
});
