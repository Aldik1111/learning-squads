# Python runner verification — 2026-11-14

Status: local real-runtime Chromium checks PASS. Shared app `tsc --noEmit` PASS. Not a deployment or Supabase persistence acceptance record.

The checked component is `src/features/python-runner/python-exercise.tsx`; the boundary is `sandbox.ts`. Pyodide **0.27.7** was downloaded from jsDelivr and executed in the browser; no Python evaluation was mocked. The temporary React harness ran at `http://127.0.0.1:4181` and used the real authored `python-count-completed` exercise. The harness contained no app credentials or production API adapter. React 19.3.1, esbuild 0.28.2, Playwright CLI 0.1.24 were used outside the repository. Its browser/server were stopped after the checks.

## Results

| Scenario | Expected/observed |
| --- | --- |
| Correct `sum(habits)` | All 6 checks pass; printed output has real newlines |
| Wrong `len(habits)` | 3/6 pass, wrong outcomes remain visible |
| Always `True` | 0/6; boolean is not treated as integer 1 |
| Count then clear input | 1/6; five input-mutation explanations |
| Invalid Python syntax | Visible `SyntaxError`; UI remains usable |
| `import js; js.fetch(...)` | AttributeError: empty JS globals bridge |
| Parent DOM/cookies from sandbox frame | Security exception; opaque origin `null` |
| Frame localStorage / worker IndexedDB | Blocked; no application-origin storage |
| App URL fetch from frame/worker | Blocked; no credential forwarding |
| Native credentialed XHR in a blob probe worker created by the same frame | Blocked by inherited `connect-src 'none'`; does not depend on the runtime fetch wrapper |
| Stop infinite program | Stops, iframe removed, editor retains code |
| Infinite loop | 8-second execution watchdog; iframe removed |
| Run after timeout | Correct program passes again in a fresh runtime |
| 390 px layout | No horizontal overflow; screenshot inspected |

The security probes deliberately produce browser CSP violation messages. They are expected evidence of a denied operation, not ignored application errors. The native-XHR probe uses a separate short-lived blob worker under the same frame policy so the tested infinite Python loop cannot block the probe itself.

## Repeat the checks

Open the Python module in an authorized local development instance on port 4181 (or a development-only harness mounting the real component and authored exercise). Use a separate test guest if an API adapter is connected. The CLI function files are browser automation snippets, not `@playwright/test` specs:

```sh
playwright-cli -s=learning-python open http://127.0.0.1:4181/learn/python-first-function --headed
playwright-cli -s=learning-python run-code --filename tests/runner/browser-checks.js
playwright-cli -s=learning-python run-code --filename tests/runner/native-network-check.js
playwright-cli -s=learning-python close
```

The first download can take up to the startup deadline (90 seconds); the test permits 105 seconds including startup plus execution. Later runs reuse public asset bytes while creating fresh interpreters. Do not replace the opaque iframe with an application-origin worker to improve startup speed.

## Remaining acceptance

Root must review the integration and verify saved self-checks against the real API, refresh, independent guest profiles and deployed CSP/headers. A passing runner check is neither a trusted qualification nor proof of course completion. No task was closed and no PR was opened by this runner work.
