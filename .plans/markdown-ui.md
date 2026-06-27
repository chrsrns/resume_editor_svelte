# Plan — Markdown export/import UI (T16 + T17)

## Summary

Wire the two markdown API functions added in T15 to the SvelteKit UI: add an export button on both the resume edit action bar and the view header, add an import button on the resume list page, and add a generic `ErrorDialog` component to surface export/import errors (V38, V39).

## Context

- Scope: only UI/buttons for export/import; no overwrite, no preview, no markdown text editor.
- SPEC: §V.37 (export button visibility), §V.38 (export error dialog), §V.39 (import error dialog + success redirect), §I export/import API, §T.16, §T.17.
- Files explored:
  - `src/lib/api/resumes.ts` — T15 functions exist.
  - `src/lib/api/client.ts` — `ApiError` used by callers.
  - `src/lib/components/ui/Button.svelte` — existing button primitive.
  - `src/lib/components/ResumeViewHeader.svelte` — view header with `canEdit` prop.
  - `src/routes/resumes/[id]/edit/+page.svelte` — edit action bar.
  - `src/routes/resumes/[id]/+page.svelte` — view page that renders header.
  - `src/routes/resumes/+page.svelte` — list page with New Resume action.
- Constraints:
  - Svelte 5 runes, TypeScript strict, custom CSS tokens, `@lucide/svelte` icons.
  - Export button on view page visible to all visitors (V37); export on edit page already only reachable by owner because edit page requires auth + ownership.
  - Error dialog must be a new component (`ErrorDialog`) with `open`, `title`, `message`, `onclose` props; do not reuse `HeadsUpDialog` (hardcoded welcome content) or modify `SaveResultPopup`.
  - Import: file input triggers `importResumeMarkdown`; on success redirect to `/resumes/<id>/edit`; on error show `ErrorDialog` with API `body` string.
  - Download: use native `URL.createObjectURL` + temporary `<a>`; no npm dependency (package.json does not include `file-saver`).

## Implementation Steps

1. **Create `ErrorDialog.svelte`** (`src/lib/components/ui/ErrorDialog.svelte`)
   - Generic modal: `open`, `title`, `message`, `onclose` props.
   - Overlay/backdrop with click-outside and Escape key close.
   - Single "Close" button in footer.
   - Style consistent with `SaveResultPopup` (overlay, popup, header, content, footer).

2. **Update `ResumeViewHeader.svelte`**
   - Add `onExport` prop.
   - Add export button next to the Edit/Back actions, always visible regardless of `canEdit`.

3. **Update `src/routes/resumes/[id]/+page.svelte`**
   - Import `exportResumeMarkdown` and `ErrorDialog`.
   - Add error dialog state (`exportErrorOpen`, `exportErrorTitle`, `exportErrorMessage`).
   - Implement `handleExport()`:
     - Calls `exportResumeMarkdown(resume.id)`.
     - Builds `URL.createObjectURL(blob)` + temporary `<a download>` to download `resume-${id}.md` (T15 filename).
     - Revokes object URL after download.
   - On `ApiError`, set dialog state and open `ErrorDialog`.
   - Pass `onExport={handleExport}` to `ResumeViewHeader`.

4. **Update `src/routes/resumes/[id]/edit/+page.svelte`**
   - Import `exportResumeMarkdown` and `ErrorDialog`.
   - Add error dialog state (can reuse same component instance, separate state vars).
   - Implement `handleExport()` like view page.
   - Add export button to the existing `.actions` bar, using `Button variant="secondary"`.

5. **Update `src/routes/resumes/+page.svelte`**
   - Import `importResumeMarkdown`, `goto`, `ErrorDialog`.
   - Add a hidden file input (`<input type="file" accept=".md,text/markdown">`).
   - Add "Import Markdown" button that clicks the file input.
   - On file selected, read `File` via `text()`, call `importResumeMarkdown(text)`.
   - On success: `goto(resolve('/resumes/[id]/edit', { id: resume.id.toString() }))`.
   - On `ApiError`: open `ErrorDialog` with title "Import failed" and the error message.
   - Show import button only when `$authToken` is set (import requires auth).

## Files to Modify

- `src/lib/components/ui/ErrorDialog.svelte` — new generic error modal.
- `src/lib/components/ResumeViewHeader.svelte` — add export button + `onExport` prop.
- `src/routes/resumes/[id]/+page.svelte` — export handler + error dialog.
- `src/routes/resumes/[id]/edit/+page.svelte` — export button + handler + error dialog.
- `src/routes/resumes/+page.svelte` — import button + file input + handler + error dialog.

## Verification

- [ ] `tests/markdown-api.spec.ts` passes (8 tests covering V2/V37/V38/V39).
- [ ] `npx playwright test tests/markdown-api.spec.ts` is the oracle for T16/T17.
- [ ] Run full suite: `npx playwright test` to confirm no regressions.
- [ ] Type-check: `npx svelte-kit sync && npx svelte-check --tsconfig ./tsconfig.json`.

## Risks/Considerations

- Playwright download assertions are brittle; the tests focus on network request headers and error dialog visibility rather than filesystem downloads.
- Import route only tested for authenticated users; UI hides the button when not logged in.
- `URL.createObjectURL` in a test environment may not actually produce a file download, but the network request is intercepted and verified.
