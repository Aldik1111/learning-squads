# Learning UI integration

Status, 2026-11-14: the components are integrated into the Next.js application in `codex/a-learning-modules`. Public deployment acceptance is recorded separately in `docs/demo.md`; integration is not evidence of a published or accepted website.

## Routes and data

- `src/app/(product)/dashboard/page.tsx` loads real courses and private progress through `src/lib/api-client/index.ts`, adapts course/module data for `CourseCatalog`, and renders saved attempt history. Module links point to `/learn/[id]`.
- `src/app/(product)/learn/[id]/page.tsx` mounts `LearningPage` with a module-specific React key. `LearningPage` loads `getModule(moduleId)` and `getProgress()`, renders Markdown without raw HTML, mounts `KnowledgeCheck` and, when present, `PythonExercise` and the Spanish conversation guide.
- Public material and authenticated commands use `src/app/api/[...path]/route.ts`. The server derives identity from the verified Bearer session and `auth.uid()`; a browser-supplied user ID does not grant rights. Public quiz payloads omit answer keys. SQL checks ordinary quiz answers against the stored content version.
- The shared API client establishes/restores the Supabase anonymous session and owns request timeouts and typed errors. No production page imports a fixture adapter or quiz answer keys. A missing backend is shown as unavailable saving; material remains readable.

## Component responsibilities

`CourseCatalog` receives loading/error/ready state and course/module presentation data. Its caller supplies trusted application-generated URLs. Loading/error/empty states do not invent courses or progress.

`KnowledgeCheck` in `../../quizzes/ui/knowledge-check.tsx` receives a public quiz, an optional saved attempt and an asynchronous submission callback. It does not grade or persist answers itself. Returned feedback must match the module/version, contain every question once, reference valid options and agree with the submitted selection. Invalid feedback is a retryable error. The component preserves answers after failure, disables editing/submission while pending, shows confirmed explanations, and allows a new attempt.

`QuizView`, `QuizAnswers`, `QuizFeedback` and `CourseCardView` are view models. `LearningPage` adapts the API's `QuizAttempt`; it restores the latest matching content version after refresh. A history entry from another content version is not presented as the current quiz result. Published content changes require a new version, preserving old attempts.

`PythonExercise` receives `PythonExerciseData` and calls `onResult(PythonRunResult)` for completed passed/failed runs. The parent saves the result through `submitPythonResult` and displays the persisted summary. Code and stdout are not persisted; restoring a summary does not restore editor source. Execution errors, timeout and cancellation are not shown as successful saves. Isolation, limits and browser checks are documented in `src/features/python-runner/README.md` and `tests/runner/README.md`. Stored results remain untrusted self-check records.

## Persistence and retries

The adapter owns command idempotency. Quiz requests retain a UUID for the same module/version/answer fingerprint until success. Python save retries retain a UUID for the same result object until success. A transport failure can occur after the server committed; retry must not create another logical attempt. A newly completed user attempt receives a new UUID. Server RPCs reject reuse with a different payload.

Progress loading and submission are independent. A progress failure does not block reading or running Python; submission can retry the backend. Late progress responses are merged with newly saved attempts by ID. Confirmed saves update visible history immediately and can subsequently be fetched from the server. Spanish recorded minutes come from completed, module-linked intervals; overlapping intervals count once. The UI makes no attendance or automatic course-completion claim.

The current app has one persistent guest profile per browser and no account-switching interface. When adding account switching, remount the learning view and clear local request/progress state for the new identity. Keep the module key and do not mount a quiz before its data is ready. Submission callbacks must settle through the API timeout/error handling.

## Verification boundary

The isolated component harness checks cover loading/error/empty states, keyboard interaction, feedback validation and responsive layout (`tests/e2e/ui-components.md`). The real local browser scenario also passed: a fresh guest submitted a server-graded 4/4 quiz, reloaded to restored answers/feedback without a focus jump, executed Python 6/6, saved and reloaded its summary, and saw both records in the dashboard. Reproduction: `tests/e2e/learning-flow.js`; environment and acceptance evidence: `docs/demo.md`.

Application typecheck/lint/build and real local API/Supabase checks have passed, with details in `tests/server/README.md`; isolated Python execution, cancellation and access restrictions also passed. These do not replace checks against the final published URL, independent guest profiles in that environment, or separate access testing of a real Meet conference. No pass threshold, attempt quota, paid feature or certification policy is introduced by this integration.
