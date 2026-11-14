# Browser Python self-check

`PythonExercise` accepts `exercise: PythonExerciseData` from `src/contracts` and optional `onResult(result: PythonRunResult): Promise<void>`. Import it from `./python-exercise`. No application/session object, access token or user ID is sent to the runtime. The adapter saves only an explicitly untrusted self-check, using the signed-in guest's API session outside the sandbox.

The component edits code, runs the public examples, reports success/wrong results/Python errors, and supports stop, timeout and retry. Input equality includes Python types (a boolean is not an integer result); mutating an input fails a preserveInput check. Each run gets a fresh runtime. Editing code is local only; the component does not promise recovery of unsaved code after refresh.

`onResult` is called only for completed checks (`passed`/`failed`). Save failures retain the result and provide Retry saving. The adapter must reuse an idempotency key for retries of the same result. It must not turn the client-reported count into an authoritative certificate or module-completion decision. Startup errors, cancellation and timeout do not call the save callback.

## Isolation boundary

The host creates a hidden `srcdoc` iframe with **only** `sandbox="allow-scripts"`. It has an opaque origin: no `allow-same-origin`, forms, popups or top navigation. A blob Worker inside the iframe runs Pyodide. The worker alone is not the boundary; the opaque origin and inherited CSP are required.

The host downloads exactly five public runtime assets from the pinned `https://cdn.jsdelivr.net/pyodide/v0.27.7/full/` distribution using `credentials: "omit"` and no referrer. It caches their bytes for the page lifetime and sends copies into each fresh sandbox. The worker's runtime loader serves only these known assets from memory; it does not proxy arbitrary URLs.

The frame CSP defaults to no resources, allows nonce/blob scripts and blob workers, and sets `connect-src 'none'`. Images, frames, forms and base URLs are denied. Worker network attempts are blocked by inherited CSP, including native APIs other than the memory-only fetch wrapper. Never broaden this policy or pass credentials to the frame. Pyodide's `js` bridge receives an empty globals object as defense in depth; it is not relied upon as the security boundary.

Parent messages require the actual iframe window, `origin === "null"` and a per-run channel; result fields are bounded and rendered as text. Learner code may still interfere with its own checks or fabricate results, so all results remain untrusted. Do not use the bridge for privileged commands, arbitrary navigation or API requests.

The parent sets a 90-second startup deadline and an 8-second execution deadline. A single `running` event starts the execution deadline; later events cannot reset it. Cancel/finish removes the iframe and terminates its dedicated worker. Source/output/case sizes are bounded; these are responsiveness protections, not hard browser memory quotas. A resource-exhausting program can still strain its browser tab.

## Deployment requirements and validation

The first run downloads the pinned runtime from jsDelivr in the host page; it needs network access. Following runs reuse cached public bytes but still create a new iframe/worker/Python interpreter. No Pyodide npm package, app-origin script or Supabase token is required. A stricter application CSP must permit the host download and sandbox frame's execution without removing its isolation. Test the actual deployed headers/browser before acceptance. Changing the runtime version or CSP requires repeating the runner browser checks. Canceling while the shared runtime download is in progress stops the run, but the public-asset cache download may finish for subsequent runs.

The runtime has been selected using the [Pyodide 0.27.7 worker documentation](https://pyodide.org/en/0.27.7/usage/webworker.html) and [JS API](https://pyodide.org/en/0.27.7/usage/api/js-api.html). The isolation model follows [iframe sandbox behavior](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe) and [CSP inheritance for blob workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers#content_security_policy). These links do not substitute for browser verification.

See `tests/runner/README.md` for exact checked scenarios and remaining integration requirements.
