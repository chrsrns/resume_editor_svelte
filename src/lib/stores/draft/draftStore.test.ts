import { describe, it, expect, beforeEach } from 'vitest';
import {
    createDraftListStore,
    createChildGroupStore,
    createDraftItemStore,
    createParentChildSection,
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

describe('createParentChildSection', () => {
    type PostDraft = {
        id: number;
        title: string;
        display_order: string;
    };

    type PostBaseline = {
        id: number;
        title: string;
        display_order: number | null;
        created_at: string;
    };

    type CommentDraft = {
        id: number;
        text: string;
        display_order: string;
    };

    type CommentBaseline = {
        id: number;
        post_id: number;
        text: string;
        display_order: number | null;
        created_at: string;
    };

    type TagDraft = {
        id: number;
        name: string;
        display_order: string;
    };

    type TagBaseline = {
        id: number;
        post_id: number;
        name: string;
        display_order: number | null;
        created_at: string;
    };

    function createParentStore() {
        const state: DraftListState<PostDraft, PostBaseline> = {
            drafts: [],
            baseline: [],
            saving: false,
            error: null
        };

        return createDraftListStore<PostDraft, PostBaseline>(state, {
            toDraft: (b) => ({
                id: b.id,
                title: b.title,
                display_order: b.display_order == null ? '' : String(b.display_order)
            }),
            toBaseline: (d, existing, meta) => ({
                id: d.id,
                title: d.title.trim(),
                display_order: toNumberOrNull(d.display_order),
                created_at: existing?.created_at ?? meta?.created_at ?? ''
            }),
            normalizeDraft: (d) => ({ title: d.title.trim() }),
            normalizeBaseline: (b) => ({ title: b.title }),
            validate: (d) => {
                if (!d.title.trim()) return 'Title is required';
                return null;
            },
            buildCreatePayload: (d) => ({
                title: d.title.trim(),
                display_order: toNumberOrNull(d.display_order)
            }),
            buildUpdatePayload: (d, b) => {
                const payload: Partial<PostBaseline> = {};
                if (d.title.trim() !== b.title) payload.title = d.title.trim();
                const order = toNumberOrNull(d.display_order);
                if (order !== b.display_order) payload.display_order = order;
                return payload;
            },
            actionType: { create: 'createPost', update: 'updatePost', delete: 'deletePost' }
        });
    }

    function createCommentStore() {
        const state: ChildGroupState<CommentDraft, CommentBaseline> = {
            draftsMap: {},
            baselineMap: {},
            baseline: []
        };

        return createChildGroupStore<CommentDraft, CommentBaseline, 'postId'>(state, {
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
            buildCreatePayload: (d) => ({
                text: d.text.trim(),
                display_order: toNumberOrNull(d.display_order)
            }),
            buildUpdatePayload: (d, b) => {
                const payload: Partial<CommentBaseline> = {};
                if (d.text.trim() !== b.text) payload.text = d.text.trim();
                const order = toNumberOrNull(d.display_order);
                if (order !== b.display_order) payload.display_order = order;
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
        });
    }

    function createTagStore() {
        const state: ChildGroupState<TagDraft, TagBaseline> = {
            draftsMap: {},
            baselineMap: {},
            baseline: []
        };

        return createChildGroupStore<TagDraft, TagBaseline, 'postId'>(state, {
            toDraft: (b) => ({
                id: b.id,
                name: b.name,
                display_order: b.display_order == null ? '' : String(b.display_order)
            }),
            toBaseline: (d, postId, existing, meta) => ({
                id: d.id,
                post_id: postId,
                name: d.name.trim(),
                display_order: toNumberOrNull(d.display_order),
                created_at: existing?.created_at ?? meta?.created_at ?? ''
            }),
            normalizeDraft: (d) => ({ name: d.name.trim() }),
            normalizeBaseline: (b) => ({ name: b.name }),
            validate: (d) => {
                if (!d.name.trim()) return 'Name is required';
                return null;
            },
            buildCreatePayload: (d) => ({
                name: d.name.trim(),
                display_order: toNumberOrNull(d.display_order)
            }),
            buildUpdatePayload: (d, b) => {
                const payload: Partial<TagBaseline> = {};
                if (d.name.trim() !== b.name) payload.name = d.name.trim();
                const order = toNumberOrNull(d.display_order);
                if (order !== b.display_order) payload.display_order = order;
                return payload;
            },
            actionType: { create: 'createTag', update: 'updateTag', delete: 'deleteTag' },
            getParentId: (b) => b.post_id,
            parentIdField: 'postId',
            getMeta: (b) => ({ created_at: b.created_at })
        });
    }

    function createSection() {
        resetTempIdCounter();
        const parentStore = createParentStore();
        const commentStore = createCommentStore();
        const tagStore = createTagStore();

        const section = createParentChildSection(
            parentStore,
            {
                comments: { label: 'Comment', store: commentStore },
                tags: { label: 'Tag', store: tagStore }
            },
            'Post'
        );

        return { parentStore, commentStore, tagStore, section };
    }

    it('initializes parent and children grouped by parent', () => {
        const { section } = createSection();
        section.initialize(
            [
                { id: 1, title: 'A', display_order: 1, created_at: '' },
                { id: 2, title: 'B', display_order: 2, created_at: '' }
            ],
            {
                comments: [
                    { id: 10, post_id: 1, text: 'c1', display_order: 1, created_at: '' },
                    { id: 11, post_id: 2, text: 'c2', display_order: 1, created_at: '' }
                ],
                tags: []
            }
        );

        expect(section.getVisibleDrafts()).toHaveLength(2);
        expect(section.children.comments.getVisibleChildren(1)).toHaveLength(1);
        expect(section.children.comments.getVisibleChildren(2)).toHaveLength(1);
        expect(section.children.tags.getVisibleChildren(1)).toHaveLength(0);
    });

    it('addParent adds child groups for all children', () => {
        const { section } = createSection();
        section.initialize([], { comments: [], tags: [] });

        const id = section.addParent({ title: 'New' });

        expect(section.getVisibleDrafts()).toHaveLength(1);
        expect(section.children.comments.getChildren(id)).toHaveLength(0);
        expect(section.children.tags.getChildren(id)).toHaveLength(0);

        section.children.comments.addChild(id, { text: 'Comment' });
        section.children.tags.addChild(id, { name: 'Tag' });

        expect(section.children.comments.getVisibleChildren(id)).toHaveLength(1);
        expect(section.children.tags.getVisibleChildren(id)).toHaveLength(1);
    });

    it('removeParent for temp id removes child groups', () => {
        const { section } = createSection();
        section.initialize([], { comments: [], tags: [] });

        const id = section.addParent({ title: 'Temp' });
        section.children.comments.addChild(id, { text: 'c' });
        section.children.tags.addChild(id, { name: 't' });
        section.removeParent(id);

        expect(section.getVisibleDrafts()).toHaveLength(0);
        expect(section.children.comments.getVisibleChildren(id)).toHaveLength(0);
        expect(section.children.tags.getVisibleChildren(id)).toHaveLength(0);
        expect(section.isDirty()).toBe(false);
    });

    it('removeParent for real id marks all existing children deleted', () => {
        const { section } = createSection();
        section.initialize([{ id: 1, title: 'A', display_order: 1, created_at: '' }], {
            comments: [{ id: 10, post_id: 1, text: 'c', display_order: 1, created_at: '' }],
            tags: [{ id: 20, post_id: 1, name: 't', display_order: 1, created_at: '' }]
        });

        section.removeParent(1);

        expect(section.getVisibleDrafts()).toHaveLength(0);
        expect(section.children.comments.getVisibleChildren(1)).toHaveLength(0);
        expect(section.children.tags.getVisibleChildren(1)).toHaveLength(0);

        const actions = section.computeDiff();
        expect(actions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ type: 'deleteComment', id: 10 }),
                expect.objectContaining({ type: 'deleteTag', id: 20 }),
                expect.objectContaining({ type: 'deletePost', id: 1 })
            ])
        );
    });

    it('validateAll and getValidationErrors aggregate parent and children with labels', () => {
        const { section } = createSection();
        section.initialize([], { comments: [], tags: [] });

        const id = section.addParent({ title: '' });
        section.children.comments.addChild(id, { text: '' });

        expect(section.validateAll()).toBe(false);

        const errors = section.getValidationErrors();
        expect(errors).toContain('Post: Title is required');
        expect(errors).toContain('Comment: Text is required');
    });

    it('isDirty aggregates parent and child state', () => {
        const { section } = createSection();
        section.initialize([{ id: 1, title: 'A', display_order: 1, created_at: '' }], {
            comments: [],
            tags: []
        });

        expect(section.isDirty()).toBe(false);
        section.updateParent(1, { title: 'B' });
        expect(section.isDirty()).toBe(true);

        section.resetToBaseline();
        expect(section.isDirty()).toBe(false);

        section.children.comments.addChild(1, { text: 'c' });
        expect(section.isDirty()).toBe(true);
    });

    it('applySaveResults remaps parent and child temp ids', () => {
        const { section } = createSection();
        section.initialize([], { comments: [], tags: [] });

        const parentId = section.addParent({ title: 'New' });
        section.children.comments.addChild(parentId, { text: 'c' });

        section.applySaveResults(
            new Map([
                [parentId, 100],
                [-2, 50]
            ])
        );

        expect(section.getVisibleDrafts()[0].id).toBe(100);
        expect(section.children.comments.getVisibleChildren(100)).toHaveLength(1);
        expect(section.children.comments.getVisibleChildren(100)[0].id).toBe(50);
    });

    it('commitBaseline updates baseline for parent and children', () => {
        const { section } = createSection();
        section.initialize([], { comments: [], tags: [] });

        const parentId = section.addParent({ title: 'New' });
        section.children.comments.addChild(parentId, { text: 'c' });

        section.applySaveResults(
            new Map([
                [parentId, 100],
                [-2, 50]
            ])
        );
        section.commitBaseline();

        expect(section.isDirty()).toBe(false);
        expect(section.getBaseline()[0].id).toBe(100);
        expect(section.children.comments.getBaseline()[0].post_id).toBe(100);
    });

    it('computeDiff includes parent and child actions with parentIdField', () => {
        const { section } = createSection();
        section.initialize([], { comments: [], tags: [] });

        const parentId = section.addParent({ title: 'New' });
        section.children.comments.addChild(parentId, { text: 'c' });

        const actions = section.computeDiff();
        expect(actions).toHaveLength(2);
        expect(actions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ type: 'createPost', tempId: -1 }),
                expect.objectContaining({
                    type: 'createComment',
                    postId: -1,
                    tempId: -2,
                    payload: { text: 'c', display_order: null }
                })
            ])
        );
    });

    it('resetToBaseline restores parent and children', () => {
        const { section } = createSection();
        section.initialize([{ id: 1, title: 'A', display_order: 1, created_at: '' }], {
            comments: [{ id: 10, post_id: 1, text: 'c', display_order: 1, created_at: '' }],
            tags: []
        });

        section.updateParent(1, { title: 'B' });
        section.children.comments.updateChild(10, { text: 'updated' });

        section.resetToBaseline();

        expect(section.getVisibleDrafts()[0].title).toBe('A');
        expect(section.children.comments.getVisibleChildren(1)[0].text).toBe('c');
        expect(section.isDirty()).toBe(false);
    });
});
