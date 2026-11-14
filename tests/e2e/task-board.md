# Task-board browser verification

Verified 2026-11-15 (Asia/Qyzylorda), local production app at http://127.0.0.1:4191, source 24bdccf, local Supabase migrations 001–011. This is local evidence, not a published-release or cloud-migration claim.

## Reproducible core check

Use Playwright CLI with an isolated QA guest and start on the app origin. Run `run-code --filename <absolute-path>/tests/e2e/task-board-flow.js` from a temporary directory outside the repository. The snippet writes only a synthetic first-Python-task result for that guest and opens a second tab sharing the same guest. It does not open the optional result URL.

Observed PASS:
- Done rejects whitespace-only descriptions; an HTTP result URL is rejected and HTTPS accepted.
- Private result, Done column and HTTPS link survive page reload.
- A second tab saves a newer revision. The first tab receives a conflict, keeps its unsaved draft and disables silent overwrite.
- Explicit “Load latest and discard this draft” restores the server version.
- 390px board and editor have no horizontal overflow; Escape closes the editor.

## Additional scoped checks performed

- Two independent browser contexts: synthetic profiles and identical weekly availability prepared through real authenticated APIs, both enrolled in the same Python group. Author checked Share and saved via UI; teammate's actual Shared task results section displayed the description and author. Author unchecked Share and saved; teammate Refresh results displayed No shared results yet. Both contexts used separate guest identities; no mocks.
- New `python-list-filters` exercise executed in real browser Pyodide using `keep_at_least`: 6/6 checks passed. Saved self-check appeared and survived reload. No CDN retry was needed.
- Selected a quiz answer and changed the unsaved Python editor in module 2; navigated through Course modules to module 3. The new `summarize_scores` starter appeared and no quiz radio remained checked. Module route remounts by id.
- French first-conversation lesson opened its specific task editor. The language privacy explanation appeared and no Share checkbox existed.
- Desktop 1440px and mobile 390px final board screenshots inspected; files retained outside Git in the QA temporary directory.

Rematch/return-to-old-group races and all 18 task/quiz definitions were covered by the separate backend SQL/HTTP suite, not repeated as browser assertions here. No external Meet room was joined in this run. Opening the synthetic group page may prepare its normal automatic meeting through the configured provider.

## Environment interruptions

The initial dev-server run repeatedly reloaded through HMR and timed out before a task assertion. The successful checks above used a production build. A later server process disappeared during tool reconnection; root restarted the same production build before remaining checks. These interruptions are not counted as product PASS. An initial overly exact label locator was replaced by the observed combobox role. The expected stale-revision HTTP conflict is intentional; final task page had zero console errors (CSS preload warnings only).
