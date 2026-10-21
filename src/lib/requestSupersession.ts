/**
 * Monotonic request token source for superseded-response rejection.
 * Each `next()` invalidates every earlier token; a handler that captured
 * an older token must not write state.
 */
export function createRequestSupersession() {
    let latest = 0;
    return {
        next(): number {
            return ++latest;
        },
        current(token: number): boolean {
            return token === latest;
        }
    };
}
