/**
 * Shared display_order comparator: null sorts last (+Infinity),
 * ties break deterministically on id.
 */
export function byDisplayOrder(
    a: { display_order: number | null; id: number },
    b: { display_order: number | null; id: number }
) {
    const ao = a.display_order ?? Number.POSITIVE_INFINITY;
    const bo = b.display_order ?? Number.POSITIVE_INFINITY;
    if (ao !== bo) return ao - bo;
    return a.id - b.id;
}
