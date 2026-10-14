/**
 * Field-spec helpers for draft store configs.
 *
 * Declares the per-field conversion law once per entity and derives the six
 * config converters from it: toDraft, toBaseline, normalizeDraft,
 * normalizeBaseline, buildCreatePayload, buildUpdatePayload.
 *
 * Meta fields (id, display_order, resume_id, created_at, parent FK) stay
 * factory-owned — section files keep writing those lines explicitly.
 */

import { toNullable, toNumberOrNull } from './shared';

export type FieldSpec =
    | { kind: 'required-trim' } // string, trimmed everywhere downstream
    | { kind: 'required-raw' } // string, kept verbatim
    | { kind: 'optional-nullable' } // string, '' in draft ↔ null in baseline
    | { kind: 'num' } // numeric string in draft ↔ number | null in baseline
    | { kind: 'num-required' } // numeric string in draft ↔ number (Number())
    | { kind: 'bool' } // boolean passthrough
    | { kind: 'bool-optional' } // boolean, null baseline defaults ?? false
    | { kind: 'derive'; get: (existing: unknown) => unknown }; // baseline-only field

function canon(kind: FieldSpec['kind'], v: unknown): unknown {
    switch (kind) {
        case 'required-trim':
            return (v as string).trim();
        case 'required-raw':
            return v;
        case 'optional-nullable':
            return toNullable(v as string);
        case 'num':
            return toNumberOrNull(v as string);
        case 'num-required':
            return Number(v);
        case 'bool':
        case 'bool-optional':
            return v;
    }
}

export function defineFields<D, B>(spec: Record<string, FieldSpec>) {
    function toDraft(b: B): D {
        const out: Record<string, unknown> = {};
        for (const [name, f] of Object.entries(spec)) {
            if (f.kind === 'derive') continue;
            const v = (b as Record<string, unknown>)[name];
            switch (f.kind) {
                case 'optional-nullable':
                    out[name] = v ?? '';
                    break;
                case 'num':
                case 'num-required':
                    out[name] = v == null ? '' : String(v);
                    break;
                case 'bool-optional':
                    out[name] = v ?? false;
                    break;
                default:
                    out[name] = v;
            }
        }
        return out as D;
    }

    function toBaseline(d: D, existing?: B): B {
        const out: Record<string, unknown> = {};
        for (const [name, f] of Object.entries(spec)) {
            if (f.kind === 'derive') {
                out[name] = f.get(existing);
                continue;
            }
            out[name] = canon(f.kind, (d as Record<string, unknown>)[name]);
        }
        return out as B;
    }

    function normalizeDraft(d: D): Record<string, unknown> {
        const out: Record<string, unknown> = {};
        for (const [name, f] of Object.entries(spec)) {
            if (f.kind === 'derive') continue;
            out[name] = canon(f.kind, (d as Record<string, unknown>)[name]);
        }
        return out;
    }

    function normalizeBaseline(b: B): Record<string, unknown> {
        const out: Record<string, unknown> = {};
        for (const [name, f] of Object.entries(spec)) {
            if (f.kind === 'derive') continue;
            const v = (b as Record<string, unknown>)[name];
            out[name] = f.kind === 'bool-optional' ? (v ?? false) : v;
        }
        return out;
    }

    function buildCreatePayload(d: D): Record<string, unknown> {
        return normalizeDraft(d);
    }

    function buildUpdatePayload(d: D, b: B): Record<string, unknown> {
        const out: Record<string, unknown> = {};
        for (const [name, f] of Object.entries(spec)) {
            if (f.kind === 'derive') continue;
            const v = canon(f.kind, (d as Record<string, unknown>)[name]);
            if (v !== (b as Record<string, unknown>)[name]) out[name] = v;
        }
        return out;
    }

    return {
        toDraft,
        toBaseline,
        normalizeDraft,
        normalizeBaseline,
        buildCreatePayload,
        buildUpdatePayload
    };
}
