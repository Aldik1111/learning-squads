"use client";

import { useRef, useState } from "react";
import { errorMessage } from "./states";

// Keep the same logical command ID after a transport failure; a changed payload is a new command.
export function useCommand() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const attempts = useRef(new Map<string, string>());
  async function run(key: string, task: (requestId: string) => Promise<void>) {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    let requestId = attempts.current.get(key);
    if (!requestId) { requestId = crypto.randomUUID(); attempts.current.set(key, requestId); }
    try { await task(requestId); attempts.current.delete(key); }
    catch (problem) { setError(errorMessage(problem)); }
    finally { busy.current = false; setPending(false); }
  }
  return { pending, error, run };
}
