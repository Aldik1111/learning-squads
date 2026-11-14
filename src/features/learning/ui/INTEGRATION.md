# UI preparation for T08

These React components are isolated UI, not application routes. T01/T02/T07 are still needed. They require React and CSS Modules supported by the selected Next.js stack; no extra production dependency is introduced.

- `CourseCatalog`: receives loading/error/ready state and course/module presentation data. Its caller provides internal module URLs after routes are agreed; only trusted application-generated URLs should be passed. Loading/error/empty states never show fictional courses or progress.
- `KnowledgeCheck` in `../../quizzes/ui/knowledge-check.tsx`: receives a public quiz and an async submission callback. It does not import answer keys, calculate correct options or persist data. Returned feedback must match the module/version, contain each question once, reference a valid correct option, and agree with the submitted selection. Missing/mismatched feedback is a retryable error, not a completed attempt.

`QuizView`, `QuizAnswers`, `QuizFeedback` and `CourseCardView` are local view models, **not API DTOs**. Once T02 is agreed, adapt `src/lib/api-client` responses in the consuming page/controller. Pass answers to the real T07 API; derive user identity on the server. The adapter owns request idempotency and must not assume a failed transport means the attempt was not saved. Do not generate a new logical attempt ID for every transport retry.

The component preserves answers after failure, disables editing/submission while pending, shows explanations after confirmation, and resets its local state on module/content-version changes. It has no pass threshold, attempt limit, guest implementation, course-completion rule or stored-progress claim. Restoring saved results after refresh is still an integration task.

Data for a module/version is immutable during an attempt. Increment the version for published content changes. Mount a new view or remount it with a new React key when account/session changes to avoid showing the previous account's selections. Do not mount the quiz until its data is loaded. The callback must settle (resolve or reject with a handled timeout); the API client owns timeout/cancellation so a stalled network does not lock the view indefinitely.

No fixture adapter or answer keys may be imported into a production route. Browser verification currently uses an external temporary harness, explicitly marked as development-only. Full application E2E and deployment acceptance remain NOT RUN; see `docs/demo.md`.
