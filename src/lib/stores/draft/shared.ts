/**
 * Shared types and utilities for draft modules.
 *
 * These are used across all section draft modules to provide consistent
 * behavior for temporary IDs, dirty detection, and validation error handling.
 */

/**
 * Status flag for every draft item.
 * - 'existing': The item exists on the server and may have local changes
 * - 'new': The item was created locally and hasn't been saved to the server yet
 * - 'deleted': The item exists on the server but is marked for deletion
 */
export type DraftStatus = 'existing' | 'new' | 'deleted';

/**
 * Wrapper applied to all entity types to track draft state.
 *
 * @template T - The base entity type (e.g., SkillDraft, EducationDraft)
 */
export type DraftItem<T> = T & {
    _status: DraftStatus;
    _tempId?: number;
    _validationError?: string;
};

/**
 * Counter for generating temporary IDs.
 * These are negative numbers to distinguish from server-assigned positive IDs.
 */
let nextTempId = -1;

/**
 * Generate a unique temporary ID for a new draft item.
 * Temporary IDs are negative to avoid conflicts with server-assigned positive IDs.
 *
 * @returns A negative number representing a temporary ID
 */
export function generateTempId(): number {
    return nextTempId--;
}

/**
 * Reset the temporary ID counter.
 * This is useful for testing or when resetting the draft state.
 */
export function resetTempIdCounter(): void {
    nextTempId = -1;
}

/**
 * Compute a signature for an object for dirty detection.
 * The signature is a JSON string representation of the object.
 *
 * @param obj - The object to compute a signature for
 * @returns A JSON string signature
 */
export function computeSignature(obj: unknown): string {
    return JSON.stringify(obj);
}

/**
 * Set or clear a validation error on a draft item.
 *
 * @template T - The draft item type
 * @param item - The draft item to update
 * @param error - The error message, or null to clear the error
 * @returns A new draft item with the validation error set or cleared
 */
export function setValidationError<T extends { _validationError?: string }>(
    item: T,
    error: string | null
): T {
    if (error === null) {
        const { _validationError, ...rest } = item as T & { _validationError?: string };
        return rest as T;
    }
    return { ...item, _validationError: error };
}

/**
 * Helper to convert a string to null if empty, otherwise return the trimmed string.
 *
 * @param value - The string to convert
 * @returns The trimmed string, or null if empty
 */
export function toNullable(value: string): string | null {
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
}

/**
 * Helper to convert a string to a number or null.
 * Returns null if the string is empty or not a valid finite number.
 *
 * @param value - The string to convert
 * @returns The parsed number, or null if invalid
 */
export function toNumberOrNull(value: string): number | null {
    const trimmed = value.trim();
    if (trimmed.length === 0) return null;
    const num = Number(trimmed);
    return Number.isFinite(num) ? num : null;
}
