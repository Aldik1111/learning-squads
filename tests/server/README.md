# Backend verification — 2026-11-14

Checks performed against the current uncommitted integration tree; root records the final SHA in Issues. No PR or task was closed by the backend agent.

## Completed locally

- `npm run typecheck`, `npm run lint`, `npm test` (3 tests), `npm run build`: PASS. Production Next.js routes compiled; this is not deployment evidence.
- `npm ci --dry-run --ignore-scripts --no-audit --no-fund`: PASS. TypeScript6.0.3 + ESLint9.39.5 match the bundled Next ESLint plugins; ESLint9 has an upstream end-of-support warning (development tooling, not application runtime).
- `npm run test:db`: PASS on disposable networkless PostgreSQL16.13. All migrations apply from empty schema. Actual SQL grading/idempotency, direct score/key access denial, cross-user attempts, max4 squad capacity, selected participants, private calls/invitations, stable transition/finish, overlap union, expired invitation error, stale availability and anon-role rejection are exercised. Two concurrent final-slot joins yield exactly one success and one SQUAD_FULL. The fixture imitates auth.uid; it does not itself verify GoTrue.
- `node --env-file=<private-local-env> scripts/test_supabase.mjs`: PASS on actual local Supabase CLI3.1.0. Five distinct anonymous users, restored session, persisted quiz/retry/private attempts, PostgREST capacity race, QA-only language matching, selected teammate invitation, foreign-call denial, immutable transition/finish. QA profiles are labelled; availability is disabled in cleanup. A format-only Meet URL was used, not a real conference.
- `TEST_APP_URL=http://127.0.0.1:4180 node --env-file=<private-local-env> scripts/test_api.mjs`: PASS against the production Next.js server and actual local Supabase. Public course read, missing/forged token rejection, ignored forged body userId, saved/retried quiz, payload conflict and isolated progress. The temporary HTTP server was stopped after testing.

## Reproduce safely

Use only a dedicated Learning Squads project. Start local Supabase from this repository and enable anonymous auth (configured in `supabase/config.toml`). Put its URL/public key in a private environment file; never print a full `supabase status` result because it may include administrative credentials. Integration scripts require only public URL/key and create clearly labelled QA users/data; they never need an admin key. The language-matching test uses a unique private-use language value so no real user's availability receives a test invitation.

Run `test_database.mjs` only with Docker available; it owns its generated container and stops it in `finally`. `database-fixture.sql` is only for disposable PostgreSQL, never for an existing Supabase database. Never reset a shared/cloud project just to run checks.

## Still separate acceptance

Browser session persistence across reload and independent profiles, rendered user flows, actual Meet link access, cloud Supabase settings/migrations, Vercel environment and published URL remain separate checks. Local anonymous auth success does not prove those cloud settings. Caller-created server timestamps are not measured attendance. Python results remain untrusted self-check data, including timeout/error/cancelled statuses.

## Additive migration006 follow-up

Audit found repeated invitations with new request IDs were not deduplicated, SQL three-valued null comparisons could return an old idempotent result for malformed payloads, and an accept transaction waiting on a row lock could use its pre-expiry transaction timestamp after the deadline. No foreign-user getCall read was found; pending/foreign participants remain denied.

Migration006 adds sender-serialized pending sender→recipient dedup (INVITATION_PENDING), explicit direct-RPC null/type guards before replay, and wall-clock expiry evaluation after the row lock. No historical invitations are cancelled or rewritten; no arbitrary call quota/cooldown is added. Later calls are allowed after acceptance, decline, cancellation or expiry.

`npm run test:db` PASS additionally covers concurrent different request IDs, accept/cancel competition with one winner, and a deliberately blocked acceptance begun before expiry but resumed after it. The test observes the lock wait and pre-deadline transaction start before asserting INVITATION_EXPIRED. Direct RPC malformed/null quiz/Python/squad/call replay, invalid profile fields, null Meet and invitation responses are rejected. Actual local Supabase migration006 + `test_supabase.mjs` PASS confirms duplicate pending error and a new call after cancellation. Typecheck/lint/unit3 PASS. Cloud001–005 must apply006 before running the updated anti-spam integration assertion.

## Final seven-migration and guest-session follow-up

All seven migrations, including `202611140007_spanish_practice_copy_v2.sql`, were applied from an empty disposable PostgreSQL and passed the complete functional/concurrency suite. Added direct checks submit Spanish v1 and v2 independently, validate v2 grading and replay the original v1 attempt unchanged after v2 exists.

Browser QA found the old shared auth-storage key reused local Supabase tokens against cloud and produced persistent401. Storage is now scoped by Supabase origin (including port); a legacy session is copied only for a matching JWT issuer. The issuer hint does not authenticate a user; the server still verifies JWTs with Supabase. Regression tests cover separate project/port keys, preserved same-project migration and malformed/foreign legacy records. The UI agent separately confirmed an old local guest can open the cloud app without clearing storage, while existing cloud A/B identities remain preserved.

A second QA finding was an upstream auth network/DNS/timeout being misreported as invalid session401. Actual SDK retryable errors, upstream5xx and429 now map to SERVICE_UNAVAILABLE503; authoritative invalid/missing-session responses remain401. Regression tests use the SDK's error classes and inspect the resulting HTTP response/code. No session is cleared by this mapping.

`npm run typecheck` now runs `next typegen && tsc --noEmit`, so generated route declarations exist on a fresh checkout before TypeScript. No environment file or browser was changed by the backend agent during this follow-up. Root owns cloud application and final commit/SHA recording.

Final rerun after both guest-session fixes: typecheck PASS; lint PASS (0 errors, 0 warnings); unit7/7 PASS; production build PASS; git diff --check PASS. All7-migration DB suite and content validation also PASS. No commits created by this agent.

## CI fixture startup follow-up

Actions run43607838250 on271270d failed before migrations: the socket readiness probe saw the PostgreSQL image's temporary initdb server, which stopped before the first fixture connection. The runner now waits for TCP127.0.0.1 and uses that same TCP endpoint for every psql call; the image's initialization server is socket-only. No business logic, migrations or existing database was changed. A fresh disposable-container seven-migration/concurrency suite passed after this tooling fix. The new CI result must be recorded separately after publishing the fix.
