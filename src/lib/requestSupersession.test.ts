import { describe, it, expect } from 'vitest';
import { createRequestSupersession } from './requestSupersession';

describe('createRequestSupersession', () => {
    it('marks the latest request as current', () => {
        const s = createRequestSupersession();
        const a = s.next();
        expect(s.current(a)).toBe(true);
    });

    it('supersedes an earlier request once a newer one starts', () => {
        const s = createRequestSupersession();
        const a = s.next();
        const b = s.next();
        expect(s.current(a)).toBe(false);
        expect(s.current(b)).toBe(true);
    });

    it('tokens increase monotonically', () => {
        const s = createRequestSupersession();
        const a = s.next();
        const b = s.next();
        const c = s.next();
        expect(a).toBeLessThan(b);
        expect(b).toBeLessThan(c);
    });
});
