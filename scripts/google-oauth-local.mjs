// Local organizer setup only. Never deployed; never prints codes or tokens.
import { createServer } from "node:http";
import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { readFile, open } from "node:fs/promises";
import { isAbsolute, basename } from "node:path";
import { parseArgs } from "node:util";

const calendarScope = "https://www.googleapis.com/auth/calendar.events";
const message = (response, status, text) => {
  response.writeHead(status, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'" });
  response.end(text);
};

async function main() {
  const { values } = parseArgs({ options: { "client-file": { type: "string" }, "output-env": { type: "string" }, "open-meet": { type: "boolean", default: false }, help: { type: "boolean" } }, strict: true });
  if (values.help) {
    console.log("node scripts/google-oauth-local.mjs --client-file <absolute private Desktop OAuth JSON> --output-env <absolute .env.google.local> [--open-meet]");
    console.log("--open-meet requires explicit organizer approval: additional Meet settings scope and anyone holding a meeting link can join.");
    return;
  }
  const scopes = values["open-meet"] ? [calendarScope, "https://www.googleapis.com/auth/meetings.space.settings"] : [calendarScope];
  const scope = scopes.join(" ");
  if (values["open-meet"]) console.log("Opt-in OPEN requested: consent includes settings for all organizer Meet calls; app-managed links allow anyone holding the link to join. Continue only with organizer approval.");
  const clientPath = values["client-file"], outputPath = values["output-env"];
  if (!clientPath || !outputPath || !isAbsolute(clientPath) || !isAbsolute(outputPath) || !/^\.env\.[a-zA-Z0-9_-]+\.local$/.test(basename(outputPath))) throw new Error("INVALID_PATHS");
  const credentials = JSON.parse(await readFile(clientPath, "utf8")).installed;
  if (!credentials || typeof credentials.client_id !== "string" || !credentials.client_id.endsWith(".apps.googleusercontent.com") || typeof credentials.client_secret !== "string" || !credentials.client_secret) throw new Error("DESKTOP_CLIENT_REQUIRED");
  // Reserve an exclusive file before consent; cannot overwrite any existing secrets.
  // On Windows use an owner-only folder ACL; mode 0600 alone is not an ACL.
  const output = await open(outputPath, "wx", 0o600);
  let server, timer;
  try {
    const state = randomBytes(32).toString("base64url");
    const verifier = randomBytes(64).toString("base64url");
    let redirectUri, host, consumed = false;
    const completed = new Promise((resolve, reject) => {
      server = createServer(async (request, response) => {
        if (request.method !== "GET" || request.headers.host !== host || !request.url?.startsWith("/oauth2/callback?")) { message(response, 404, "Not found."); return; }
        const callback = new URL(request.url, redirectUri);
        const receivedState = Buffer.from(callback.searchParams.get("state") ?? "");
        if (receivedState.length !== state.length || !timingSafeEqual(receivedState, Buffer.from(state))) { message(response, 400, "Invalid authorization state."); return; }
        if (consumed) { message(response, 409, "Authorization already processed."); return; }
        consumed = true;
        const code = callback.searchParams.get("code");
        if (!code || callback.searchParams.has("error")) { message(response, 400, "Authorization was not completed. Close this tab."); reject(new Error("CONSENT_NOT_COMPLETED")); return; }
        try {
          const result = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST", redirect: "error", signal: AbortSignal.timeout(20_000),
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ client_id: credentials.client_id, client_secret: credentials.client_secret, code, code_verifier: verifier, redirect_uri: redirectUri, grant_type: "authorization_code" }),
          });
          if (!result.ok) throw new Error("TOKEN_EXCHANGE_FAILED");
          const data = await result.json();
          if (typeof data.refresh_token !== "string" || !data.refresh_token || !scopes.every(required => String(data.scope ?? "").split(" ").includes(required))) throw new Error("REFRESH_TOKEN_OR_SCOPE_MISSING");
          const variables = { GOOGLE_CLIENT_ID: credentials.client_id, GOOGLE_CLIENT_SECRET: credentials.client_secret, GOOGLE_REFRESH_TOKEN: data.refresh_token, GOOGLE_CALENDAR_ID: "primary", GOOGLE_MEET_OPEN_ACCESS: values["open-meet"] ? "true" : "false" };
          // Refuse multiline/quoted values instead of risking dotenv interpolation.
          if (Object.values(variables).some(value => !/^[A-Za-z0-9._~+\/-]+$/.test(value))) throw new Error("UNEXPECTED_CREDENTIAL_FORMAT");
          await output.writeFile(Object.entries(variables).map(([key, value]) => `${key}=${value}`).join("\n") + "\n", "utf8");
          await output.sync();
          message(response, 200, "Organizer authorization saved privately. You can close this tab.");
          resolve();
        } catch { message(response, 500, "Authorization could not be saved. No credentials are shown here."); reject(new Error("AUTHORIZATION_FAILED")); }
      });
      server.requestTimeout = 25_000;
      server.headersTimeout = 10_000;
      server.on("error", () => reject(new Error("LOOPBACK_SERVER_FAILED")));
      server.listen(0, "127.0.0.1", () => {
        host = `127.0.0.1:${server.address().port}`;
        redirectUri = `http://${host}/oauth2/callback`;
        const authorization = new URL("https://accounts.google.com/o/oauth2/v2/auth");
        authorization.search = new URLSearchParams({ client_id: credentials.client_id, redirect_uri: redirectUri, response_type: "code", scope, access_type: "offline", prompt: "consent", state, code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256" }).toString();
        console.log("Open this one-time consent URL in the organizer's browser (expires in 10 minutes):");
        console.log(authorization.toString());
      });
      timer = setTimeout(() => reject(new Error("CONSENT_TIMED_OUT")), 10 * 60_000);
    });
    await completed;
    console.log("Saved organizer credentials to the requested private file. No tokens were printed.");
  } finally {
    clearTimeout(timer);
    server?.closeAllConnections();
    server?.close();
    await output.close();
  }
}

main().catch(() => {
  // Never emit provider error bodies, paths containing user data, or a stack with secrets.
  console.error("Setup failed. Check Desktop client, absolute paths, organizer consent and network. Output must not exist; an unsuccessful run may leave an empty reserved file.");
  process.exitCode = 1;
});
