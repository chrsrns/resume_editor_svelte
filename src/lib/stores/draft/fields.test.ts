import { describe, it, expect } from 'vitest';
import { defineFields } from './fields';

type D = {
    req: string;
    raw: string;
    opt: string;
    n: string;
    nreq: string;
    flag: boolean;
    optflag: boolean;
};

type B = {
    req: string;
    raw: string;
    opt: string | null;
    n: number | null;
    nreq: number;
    flag: boolean;
    optflag: boolean;
    derived: boolean;
};

const fields = defineFields<D, B>()({
    req: { kind: 'required-trim' },
    raw: { kind: 'required-raw' },
    opt: { kind: 'optional-nullable' },
    n: { kind: 'num' },
    nreq: { kind: 'num-required' },
    flag: { kind: 'bool' },
    optflag: { kind: 'bool-optional' },
    derived: { kind: 'derive', get: (e) => (e as B | undefined)?.derived ?? true }
});

const baseline: B = {
    req: 'A',
    raw: 'B',
    opt: null,
    n: 10,
    nreq: 42,
    flag: true,
    optflag: true,
    derived: false
};

describe('defineFields', () => {
    it('toDraft converts baseline to draft shape', () => {
        expect(fields.toDraft(baseline)).toEqual({
            req: 'A',
            raw: 'B',
            opt: '',
            n: '10',
            nreq: '42',
            flag: true,
            optflag: true
        });
    });

    it('toDraft defaults missing optional kinds', () => {
        const d = fields.toDraft({ ...baseline, n: null, optflag: null as never });
        expect(d.n).toBe('');
        expect(d.optflag).toBe(false);
    });

    it('toBaseline applies per-field law and derives baseline-only fields', () => {
        const d = { req: ' A ', raw: 'B ', opt: ' ', n: '12', nreq: '7', flag: false, optflag: false };
        expect(fields.toBaseline(d, baseline)).toEqual({
            req: 'A',
            raw: 'B ',
            opt: null,
            n: 12,
            nreq: 7,
            flag: false,
            optflag: false,
            derived: false
        });
    });

    it('derive defaults when no existing baseline', () => {
        const d = { req: 'A', raw: 'B', opt: '', n: '', nreq: '0', flag: true, optflag: true };
        expect(fields.toBaseline(d).derived).toBe(true);
    });

    it('normalizeDraft and normalizeBaseline converge on the same domain', () => {
        const d = { req: 'A ', raw: 'B ', opt: ' ', n: '10', nreq: '42', flag: true, optflag: false };
        expect(fields.normalizeDraft(d)).toEqual({
            req: 'A',
            raw: 'B ',
            opt: null,
            n: 10,
            nreq: 42,
            flag: true,
            optflag: false
        });
        expect(fields.normalizeBaseline({ ...baseline, optflag: null as never })).toEqual({
            req: 'A',
            raw: 'B',
            opt: null,
            n: 10,
            nreq: 42,
            flag: true,
            optflag: false
        });
    });

    it('buildUpdatePayload emits only changed canonical fields', () => {
        const d = { req: 'A', raw: 'B', opt: 'x', n: '10', nreq: '42', flag: true, optflag: true };
        expect(fields.buildUpdatePayload(d, baseline)).toEqual({ opt: 'x' });
        const d2 = { req: 'A', raw: 'B', opt: ' ', n: '10', nreq: '42', flag: true, optflag: true };
        expect(fields.buildUpdatePayload(d2, baseline)).toEqual({});
    });
});
