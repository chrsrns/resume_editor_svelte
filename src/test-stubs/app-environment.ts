export let browser = false;
export const building = false;
export const dev = false;
export const version = 'test';

/** Lets a test boot a module against its browser-only code paths. */
export function setTestBrowser(value: boolean) {
    browser = value;
}
