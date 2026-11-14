"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { JsonValue, PythonExerciseData, PythonRunResult } from "../../contracts";
import { runPythonExercise, type PythonExecution } from "./sandbox";
import styles from "./python-exercise.module.css";

export type PythonExerciseProps = {
  exercise: PythonExerciseData;
  onResult?: (result: PythonRunResult) => Promise<void>;
};

function pythonLiteral(value: JsonValue): string {
  if (value === null) return "None";
  if (typeof value === "boolean") return value ? "True" : "False";
  if (Array.isArray(value)) return `[${value.map(pythonLiteral).join(", ")}]`;
  if (typeof value === "object") return `{${Object.entries(value).map(([key, item]) => `${JSON.stringify(key)}: ${pythonLiteral(item)}`).join(", ")}}`;
  return JSON.stringify(value);
}

export function PythonExercise(props: PythonExerciseProps) {
  return <Exercise key={JSON.stringify([props.exercise.id, props.exercise.exerciseVersion])} {...props} />;
}

function Exercise({ exercise, onResult }: PythonExerciseProps) {
  const id = useId();
  const [code, setCode] = useState(exercise.starterCode);
  const [phase, setPhase] = useState<"idle" | "loading" | "running">("idle");
  const [result, setResult] = useState<PythonRunResult | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const activeRun = useRef<PythonExecution | null>(null);
  const active = useRef(true);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const busy = phase !== "idle";

  useEffect(() => {
    active.current = true;
    return () => { active.current = false; activeRun.current?.cancel(); };
  }, []);
  useEffect(() => { if (result) resultHeading.current?.focus(); }, [result]);

  async function save(value: PythonRunResult) {
    if (!onResult) return;
    setSaveState("saving");
    try {
      await onResult(value);
      if (active.current) setSaveState("saved");
    } catch {
      if (active.current) setSaveState("error");
    }
  }

  async function run() {
    if (activeRun.current || saveState === "saving") return;
    setResult(null);
    setSaveState("idle");
    const execution = runPythonExercise(exercise, code, setPhase);
    activeRun.current = execution;
    const value = await execution.result;
    activeRun.current = null;
    if (!active.current) return;
    setPhase("idle");
    setResult(value);
    // Failed/cancelled infrastructure is not evidence of completed practice.
    if (value.status === "passed" || value.status === "failed") await save(value);
  }

  return <section className={styles.panel} aria-labelledby={`${id}-title`}>
    <p className={styles.eyebrow}>Python practice</p>
    <h2 id={`${id}-title`}>{exercise.title}</h2>
    <p>{exercise.inputDescription}</p><p>{exercise.outputDescription}</p>
    <label htmlFor={`${id}-code`} className={styles.label}>Your Python code</label>
    <textarea id={`${id}-code`} value={code} onChange={(event) => setCode(event.target.value)} disabled={busy} spellCheck={false} autoCapitalize="off" autoCorrect="off" rows={10} className={styles.editor} aria-describedby={`${id}-hint`} />
    <p id={`${id}-hint`} className={styles.hint}>Run your code against the examples below. This is a learning self-check, not a verified qualification.</p>
    <div className={styles.actions}>
      <button type="button" onClick={run} disabled={busy || saveState === "saving" || !code.trim()}>Run checks</button>
      {busy && <button type="button" className={styles.secondary} onClick={() => activeRun.current?.cancel()}>Stop execution</button>}
      {!busy && <button type="button" className={styles.secondary} onClick={() => { setCode(exercise.starterCode); setResult(null); setSaveState("idle"); }} disabled={saveState === "saving"}>Reset code</button>}
    </div>
    <p role="status">{phase === "loading" ? "Loading Python… The first run may take a moment." : phase === "running" ? "Running your checks…" : ""}</p>
    <details><summary>Example checks ({exercise.cases.length})</summary><ul className={styles.cases}>{exercise.cases.map((item) => <li key={item.id}><strong>{item.label}</strong><code>{exercise.entrypoint}({item.args.map(pythonLiteral).join(", ")}) → {pythonLiteral(item.expected)}</code></li>)}</ul></details>
    {result && <div className={styles.result}>
      <h3 ref={resultHeading} tabIndex={-1}>{result.status === "passed" ? `All ${result.cases.length} checks passed` : result.status === "failed" ? `${result.cases.filter((item) => item.passed).length} of ${result.cases.length} checks passed` : result.status === "timeout" ? "Execution timed out" : result.status === "cancelled" ? "Execution stopped" : "Python needs attention"}</h3>
      {result.error && <pre className={styles.error}>{result.error}</pre>}
      {result.cases.length > 0 && <ul className={styles.cases}>{result.cases.map((item) => <li key={item.id}><strong>{item.passed ? "Passed" : "Review"}: {item.label}</strong>{item.actual !== undefined && <code>Returned: {item.actual}</code>}{item.error && <p>{item.error}</p>}</li>)}</ul>}
      {result.stdout && <details open><summary>Output</summary><pre>{result.stdout}</pre></details>}
      {onResult && <p role="status">{saveState === "saving" ? "Saving this self-check…" : saveState === "saved" ? "Self-check saved." : saveState === "error" ? "Your checks ran, but we could not save the result. Retry saving below." : ""}</p>}
      {saveState === "error" && <button type="button" onClick={() => save(result)}>Retry saving</button>}
    </div>}
  </section>;
}
