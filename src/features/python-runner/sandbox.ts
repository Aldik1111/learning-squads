import type { PythonExerciseData, PythonRunResult } from "../../contracts";

// Pin the complete distribution: upgrading requires re-running the isolation checks.
export const PYODIDE_BASE = "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/";
const STARTUP_TIMEOUT_MS = 90_000;
const EXECUTION_TIMEOUT_MS = 8_000;
const MAX_SOURCE_LENGTH = 40_000;
const MAX_OUTPUT_LENGTH = 16_000;
const RUNTIME_FILES = ["pyodide.js", "pyodide.asm.js", "pyodide.asm.wasm", "python_stdlib.zip", "pyodide-lock.json"] as const;
type RuntimeAssets = Record<string, ArrayBuffer>;
let cachedAssets: Promise<RuntimeAssets> | undefined;

function loadRuntimeAssets(): Promise<RuntimeAssets> {
  if (!cachedAssets) {
    cachedAssets = Promise.all(RUNTIME_FILES.map(async (name) => {
      const response = await fetch(PYODIDE_BASE + name, { credentials: "omit", referrerPolicy: "no-referrer", cache: "force-cache", signal: AbortSignal.timeout(85_000) });
      if (!response.ok) throw new Error(`Could not load Python runtime (${response.status}).`);
      return [name, await response.arrayBuffer()] as const;
    })).then((entries) => Object.fromEntries(entries)).catch((error: unknown) => {
      cachedAssets = undefined;
      throw error;
    });
  }
  return cachedAssets;
}

const checkProgram = String.raw`
import json, copy
_cases = json.loads(_case_json)
_namespace = {}
_results = []
exec(compile(_source_text, '<exercise>', 'exec'), _namespace)
_function = _namespace.get(_entrypoint)
if not callable(_function):
    raise ValueError('Define a callable function named ' + _entrypoint)
def _same_value(actual, expected):
    if type(actual) is not type(expected):
        return False
    if isinstance(expected, list):
        return len(actual) == len(expected) and all(_same_value(a, b) for a, b in zip(actual, expected))
    if isinstance(expected, dict):
        return actual.keys() == expected.keys() and all(_same_value(actual[k], v) for k, v in expected.items())
    return actual == expected
for _case in _cases:
    _args = copy.deepcopy(_case['args'])
    _before = copy.deepcopy(_args)
    try:
        _actual = _function(*_args)
        _unchanged = _same_value(_args, _before)
        _passed = _same_value(_actual, _case['expected']) and (not _preserve_input or _unchanged)
        _result = {'id': _case['id'], 'label': _case['label'], 'passed': _passed, 'actual': repr(_actual)[:1000]}
        if _preserve_input and not _unchanged:
            _result['error'] = 'The function changed its input.'
    except BaseException as _error:
        _result = {'id': _case['id'], 'label': _case['label'], 'passed': False, 'error': (type(_error).__name__ + ': ' + str(_error))[:1000]}
    _results.append(_result)
json.dumps(_results)
`;

function workerSource() {
  return String.raw`
    const send = self.postMessage.bind(self);
    let output = '';
    const append = (line) => { output = (output + line + '\n').slice(0, ${MAX_OUTPUT_LENGTH}); };
    self.onmessage = async (event) => {
      const { code, exercise, assets } = event.data;
      self.onmessage = null;
      try {
        const nativeImportScripts = self.importScripts.bind(self);
        const assetName = (input) => {
          const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url, ${JSON.stringify(PYODIDE_BASE)});
          const name = url.href.slice(${PYODIDE_BASE.length});
          if (!url.href.startsWith(${JSON.stringify(PYODIDE_BASE)}) || !Object.prototype.hasOwnProperty.call(assets, name)) throw new Error('Only the bundled Python runtime is available. Network access is disabled.');
          return name;
        };
        self.importScripts = (...urls) => {
          for (const url of urls) {
            const blobUrl = URL.createObjectURL(new Blob([assets[assetName(url)]], { type: 'text/javascript' }));
            try { nativeImportScripts(blobUrl); } finally { URL.revokeObjectURL(blobUrl); }
          }
        };
        self.fetch = async (input) => {
          const name = assetName(input);
          return new Response(assets[name].slice(0), { headers: { 'Content-Type': name.endsWith('.wasm') ? 'application/wasm' : name.endsWith('.json') ? 'application/json' : 'application/octet-stream' } });
        };
        importScripts(${JSON.stringify(PYODIDE_BASE + "pyodide.js")});
        const runtime = await loadPyodide({ indexURL: ${JSON.stringify(PYODIDE_BASE)}, stdout: append, stderr: append, jsglobals: Object.create(null) });
        runtime.globals.set('_source_text', code);
        runtime.globals.set('_case_json', JSON.stringify(exercise.cases));
        runtime.globals.set('_entrypoint', exercise.entrypoint);
        runtime.globals.set('_preserve_input', exercise.preserveInput);
        send({ type: 'running' });
        const json = await runtime.runPythonAsync(${JSON.stringify(checkProgram)});
        const cases = JSON.parse(json);
        send({ type: 'result', status: cases.every(item => item.passed) ? 'passed' : 'failed', cases, stdout: output });
      } catch (error) {
        send({ type: 'result', status: 'error', cases: [], stdout: output, error: String(error).slice(0, 4000) });
      }
    };
  `;
}

function frameDocument(channel: string) {
  const script = `
    const channel = ${JSON.stringify(channel)};
    let worker;
    let workerUrl;
    let started = false;
    const send = (message) => parent.postMessage({ channel, ...message }, '*');
    addEventListener('message', event => {
      if (event.source !== parent || event.data?.channel !== channel) return;
      if (event.data.type === 'cancel') { worker?.terminate(); return; }
      if (event.data.type !== 'start' || started) return;
      started = true;
      try {
        workerUrl = URL.createObjectURL(new Blob([${JSON.stringify(workerSource())}], { type: 'text/javascript' }));
        worker = new Worker(workerUrl);
        worker.onmessage = event => send(event.data);
        worker.onerror = () => send({ type: 'result', status: 'error', cases: [], stdout: '', error: 'Python could not start. Check your connection and try again.' });
        worker.postMessage({ code: event.data.code, exercise: event.data.exercise, assets: event.data.assets });
      } catch (error) {
        send({ type: 'result', status: 'error', cases: [], stdout: '', error: String(error).slice(0, 1000) });
      }
    });
    addEventListener('pagehide', () => { worker?.terminate(); if (workerUrl) URL.revokeObjectURL(workerUrl); });
    send({ type: 'ready' });
  `;
  // No allow-same-origin, forms, navigation, popups, images or arbitrary connections.
  // A blob worker inherits this document's CSP, unlike a normal URL worker.
  const csp = `default-src 'none'; script-src 'nonce-${channel}' 'unsafe-eval' blob:; worker-src blob:; connect-src 'none'; img-src 'none'; style-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'`;
  return `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${csp}"><meta name="referrer" content="no-referrer"></head><body><script nonce="${channel}">${script.replaceAll("</script", "<\\/script")}</script></body></html>`;
}

export type PythonExecution = { result: Promise<PythonRunResult>; cancel: () => void };

export function runPythonExercise(
  exercise: PythonExerciseData,
  code: string,
  onPhase?: (phase: "loading" | "running") => void,
): PythonExecution {
  const channel = crypto.randomUUID();
  const startedAt = performance.now();
  const frame = document.createElement("iframe");
  frame.setAttribute("sandbox", "allow-scripts");
  frame.setAttribute("aria-hidden", "true");
  frame.title = "Isolated Python runtime";
  frame.hidden = true;
  frame.referrerPolicy = "no-referrer";
  let settled = false;
  let running = false;
  let assets: RuntimeAssets;
  let timer: ReturnType<typeof setTimeout>;
  let resolveResult: (value: PythonRunResult) => void;
  const result = new Promise<PythonRunResult>((resolve) => { resolveResult = resolve; });

  function finish(value: Pick<PythonRunResult, "status" | "cases" | "stdout" | "error">) {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    window.removeEventListener("message", receive);
    frame.contentWindow?.postMessage({ channel, type: "cancel" }, "*");
    frame.remove();
    resolveResult({ ...value, exerciseId: exercise.id, exerciseVersion: exercise.exerciseVersion, durationMs: Math.round(performance.now() - startedAt) });
  }

  function receive(event: MessageEvent) {
    if (event.source !== frame.contentWindow || event.origin !== "null" || event.data?.channel !== channel) return;
    const data = event.data;
    if (data.type === "ready") {
      frame.contentWindow?.postMessage({ channel, type: "start", exercise: { entrypoint: exercise.entrypoint, preserveInput: exercise.preserveInput, cases: exercise.cases }, code, assets }, "*");
    } else if (data.type === "running" && !running) {
      running = true;
      onPhase?.("running");
      clearTimeout(timer);
      timer = setTimeout(() => finish({ status: "timeout", cases: [], stdout: "", error: "Execution stopped after 8 seconds. Check for an infinite loop and try again." }), EXECUTION_TIMEOUT_MS);
    } else if (data.type === "result") {
      if (!["passed", "failed", "error"].includes(data.status) || !Array.isArray(data.cases) || typeof data.stdout !== "string") return;
      if (data.status !== "error" && (data.cases.length !== exercise.cases.length || data.cases.some((item: { id?: unknown; passed?: unknown }, index: number) => item?.id !== exercise.cases[index].id || typeof item.passed !== "boolean"))) return;
      const cases = (data.status === "error" ? [] : data.cases).slice(0, exercise.cases.length).map((item: { id: string; passed: boolean; actual?: unknown; error?: unknown }, index: number) => ({
        id: exercise.cases[index].id, label: exercise.cases[index].label, passed: item.passed,
        ...(typeof item.actual === "string" ? { actual: item.actual.slice(0, 1000) } : {}),
        ...(typeof item.error === "string" ? { error: item.error.slice(0, 1000) } : {}),
      }));
      finish({ status: data.status === "error" ? "error" : cases.every((item: { passed: boolean }) => item.passed) ? "passed" : "failed", cases, stdout: data.stdout.slice(0, MAX_OUTPUT_LENGTH), ...(typeof data.error === "string" ? { error: data.error.slice(0, 4000) } : {}) });
    }
  }

  if (!code.trim() || code.length > MAX_SOURCE_LENGTH || !exercise.cases.length || exercise.cases.length > 100) {
    queueMicrotask(() => finish({ status: "error", cases: [], stdout: "", error: "Enter Python code (up to 40,000 characters) and use an exercise with 1–100 checks." }));
  } else {
    onPhase?.("loading");
    window.addEventListener("message", receive);
    timer = setTimeout(() => finish({ status: "error", cases: [], stdout: "", error: "Python could not load within 90 seconds. Check your connection and try again." }), STARTUP_TIMEOUT_MS);
    void loadRuntimeAssets().then((loaded) => {
      if (settled) return;
      assets = loaded;
      frame.srcdoc = frameDocument(channel);
      document.body.append(frame);
    }).catch(() => finish({ status: "error", cases: [], stdout: "", error: "Python runtime could not download. Check your connection and try again." }));
  }
  return { result, cancel: () => finish({ status: "cancelled", cases: [], stdout: "", error: "Execution stopped. Your code is still here." }) };
}
