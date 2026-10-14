import { describe, it, expect } from 'vitest';
import { processSection } from './saveOrchestrator';
import type { DraftAction } from './draftStore';
import { ApiError } from '$lib/api/client';

type FakeStore = {
    applySaveResults(tempIdMap: Map<number, number>, succeededDeleteIds?: Set<number>): void;
    commitBaseline(): void;
    computeDiff(): DraftAction[];
    isDirty(): boolean;
};

function makeStore(actions: DraftAction[]): FakeStore {
    return {
        calls: [] as string[],
        computeDiff: () => actions,
        applySaveResults(this: FakeStore & { calls: string[] }, map, succeeded) {
            this.calls.push(`applySaveResults(${[...map.keys()].join(',')}|${[...(succeeded ?? [])].join(',')})`);
        },
        commitBaseline(this: FakeStore & { calls: string[] }) {
            this.calls.push('commitBaseline');
        },
        isDirty: () => true
    } as FakeStore;
}

const plan = (store: FakeStore, log: string[]) => ({
    kind: 'entity' as const,
    label: 'Edu',
    store,
    actionTypes: { create: 'createEducation', update: 'updateEducation', delete: 'deleteEducation' },
    call: {
        create: async (resumeId: number, payload: unknown) => {
            log.push('parentCreate');
            return { id: 500 };
        },
        update: async (id: number, payload: unknown) => {
            log.push(`parentUpdate:${id}`);
        },
        delete: async (id: number) => {
            log.push(`parentDelete:${id}`);
        }
    },
    childGroups: [
        {
            label: 'Edu key points',
            actionTypes: { create: 'createKeyPoint', update: 'updateKeyPoint', delete: 'deleteKeyPoint' },
            parentIdField: 'educationId',
            call: {
                create: async (resumeId: number, parentId: number, payload: unknown) => {
                    log.push(`childCreate:${parentId}`);
                    return { id: 600 };
                },
                update: async (id: number, payload: unknown) => {
                    log.push(`childUpdate:${id}`);
                },
                delete: async (id: number) => {
                    log.push(`childDelete:${id}`);
                }
            }
        }
    ]
});

describe('processSection', () => {
    it('runs phases in order: parent create, child create, updates, child deletes, parent deletes', async () => {
        const actions: DraftAction[] = [
            { type: 'createEducation', tempId: -1, payload: {} },
            { type: 'createKeyPoint', educationId: -1, tempId: -2, payload: {} },
            { type: 'updateEducation', id: 10, payload: { a: 1 } },
            { type: 'updateKeyPoint', id: 20, payload: { a: 2 } },
            { type: 'deleteKeyPoint', id: 30 },
            { type: 'deleteEducation', id: 40 }
        ] as DraftAction[];
        const log: string[] = [];
        const store = makeStore(actions) as FakeStore & { calls: string[] };
        store.calls = [];

        const { errors } = await processSection(1, plan(store, log));

        expect(errors).toEqual([]);
        expect(log).toEqual([
            'parentCreate',
            'childCreate:500',
            'parentUpdate:10',
            'childUpdate:20',
            'childDelete:30',
            'parentDelete:40'
        ]);
        expect(store.calls).toEqual([
            'applySaveResults(-1|)',
            'commitBaseline',
            'applySaveResults(-1,-2|)',
            'commitBaseline',
            'commitBaseline',
            'commitBaseline',
            'applySaveResults(|30,40)',
            'commitBaseline'
        ]);
    });

    it('skips child creates whose parent creation failed', async () => {
        const actions: DraftAction[] = [
            { type: 'createEducation', tempId: -1, payload: {} },
            { type: 'createKeyPoint', educationId: -1, tempId: -2, payload: {} }
        ] as DraftAction[];
        const log: string[] = [];
        const store = makeStore(actions) as FakeStore & { calls: string[] };
        store.calls = [];
        const p = plan(store, log);
        p.call.create = async () => {
            log.push('parentCreate');
            throw new ApiError(500, 'boom');
        };

        const { errors } = await processSection(1, p);

        expect(log).toEqual(['parentCreate']);
        expect(errors).toHaveLength(1);
        expect(errors[0].section).toBe('Edu');
    });

    it('aggregates errors from every phase without short-circuiting', async () => {
        const actions: DraftAction[] = [
            { type: 'updateEducation', id: 10, payload: {} },
            { type: 'deleteKeyPoint', id: 30 },
            { type: 'deleteEducation', id: 40 }
        ] as DraftAction[];
        const log: string[] = [];
        const store = makeStore(actions) as FakeStore & { calls: string[] };
        store.calls = [];
        const p = plan(store, log);
        p.call.update = async () => {
            throw new ApiError(500, 'update boom');
        };
        p.childGroups![0].call.delete = async () => {
            throw new ApiError(500, 'child delete boom');
        };

        const { errors } = await processSection(1, p);

        expect(errors).toHaveLength(2);
        expect(log).toEqual(['parentDelete:40']);
        // failed child delete is not flushed; succeeded parent delete is
        expect(store.calls.at(-2)).toBe('applySaveResults(|40)');
    });

    it('treats delete 404 as success', async () => {
        const actions: DraftAction[] = [{ type: 'deleteEducation', id: 40 }] as DraftAction[];
        const store = makeStore(actions) as FakeStore & { calls: string[] };
        store.calls = [];
        const log: string[] = [];
        const p = plan(store, log);
        p.call.delete = async () => {
            throw new ApiError(404, 'gone');
        };

        const { errors } = await processSection(1, p);

        expect(errors).toEqual([]);
        expect(store.calls.at(-2)).toBe('applySaveResults(|40)');
    });
});
