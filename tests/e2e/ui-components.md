# T08 component verification

Status: isolated browser checks PASS on 2026-11-14. Application E2E is NOT RUN. These are repeatable scenarios, not installed Playwright tests or a production mock adapter.

## Setup after bootstrap

Use the agreed React/Next.js tooling from B. Mount `CourseCatalog` and `KnowledgeCheck` in a development-only harness with content from the three authored modules. Pass a controllable async callback which can resolve, reject, remain pending, return the wrong content version, or omit feedback. Make the simulated state explicit on the page. Do not bundle answer keys or a fixture callback into production routes. Component presentation types and adapter requirements are in `src/features/learning/ui/INTEGRATION.md`.

## Scenarios checked in Chromium

1. Catalog loading: status text, no stale cards. Error: message and retry. Retry: three real authored course titles. Empty collection: explanatory text, no fabricated cards/progress.
2. Python quiz starts unanswered; submit disabled. Use Tab/arrow keys to select a radio. Fill all four questions, deliberately choose `3` for the mixed habit list. Submit: 3/4, correct answer `2`, explanation, keyboard focus on the result heading.
3. Try again: all answers clear, submit disabled, focus on the first option. This does not delete a saved attempt or impose a retry limit.
4. Fill all correct answers; reject submission. Error receives focus and all four selections remain. Resolve the retry: 4/4 with explanations.
5. Return another content version or omit one question's feedback. Show an error, preserve selections, never report a successful result.
6. Hold a submission pending: radios and submit disabled. Dispatch a second form submit: callback count remains one. Release: confirmed result appears.
7. While a Python submission is pending, select the AI module, then release the old response. AI stays unanswered and has no Python result. The wrapper's module/version key isolates attempt state.
8. At 390 px width, check the long AI questions and wrapping options; `document.documentElement.scrollWidth <= innerWidth`. At 1440 px inspect three catalog cards. No content overlaps; browser console has no errors or warnings.

## Still required with the real application

Real guest/session creation, API errors and request idempotency, persisted attempt restoration after refresh, account changes, navigation URLs, lesson rendering, Python execution, integration with progress and deployed multi-user E2E. Do not infer any of these from component PASS results.
