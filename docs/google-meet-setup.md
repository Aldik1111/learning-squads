# Organizer Google Calendar / Meet setup

This integration creates private Calendar events and their Google Meet conferences in the single organizer account approved by the owner. It does not request participant Google accounts, read their calendars, add attendees or send invitation emails. The organizer's personal address and credentials must stay outside this repository.

## One-time organizer consent

1. In the organizer's Google Cloud project, enable **Google Calendar API**. Configure the OAuth consent screen. For an external app in Testing, add the organizer as a test user privately.
2. Create an OAuth client of type **Desktop app** for the local setup utility. Download its JSON into a private folder outside the repository. Do not paste it into chat, screenshots, issue comments or terminal output. Desktop clients use a loopback redirect and PKCE; no public callback endpoint is required. [Google Desktop OAuth instructions](https://developers.google.com/identity/protocols/oauth2/native-app).
3. Run the helper from the repository, replacing these example paths with private absolute paths:

   ```powershell
   node scripts/google-oauth-local.mjs --client-file "C:\private\desktop-client.json" --output-env "C:\private\.env.google.local"
   ```

   The output must not already exist. The helper reserves it with exclusive creation and mode 0600; on Windows, the containing folder must also have an owner-only ACL. It listens only on `127.0.0.1`, validates state, uses PKCE S256, expires after ten minutes, and never prints an authorization code, access token or refresh token. It prints a one-time consent URL; open it in the organizer's browser and choose the approved account. An unsuccessful run can leave an empty reserved file; inspect its size privately before deliberately replacing/removing it and retrying.
4. Consent requests only `https://www.googleapis.com/auth/calendar.events`, with offline access. This scope authorizes event access in calendars available to the organizer; our code addresses only the configured calendar. It is not consent from any participant. The helper checks the returned scope and saves the refresh token privately. [Google Calendar authorization scopes](https://developers.google.com/workspace/calendar/api/auth).
5. Copy the saved variables into the application's server environment using a private secret workflow. Do not print the file. For local Next.js development merge them into the ignored `.env.local`; `.env.google.local` is a transfer file and is **not loaded automatically by Next.js**. In Vercel, set the appropriate deployment environment and redeploy. Never prefix these variables with `NEXT_PUBLIC_`:

   | Variable | Meaning |
   | --- | --- |
   | `GOOGLE_CLIENT_ID` | Organizer setup OAuth client |
   | `GOOGLE_CLIENT_SECRET` | Client credential from the same client |
   | `GOOGLE_REFRESH_TOKEN` | Organizer's offline authorization |
   | `GOOGLE_CALENDAR_ID` | `primary` by default; only change to an explicitly approved calendar |
   | `GOOGLE_MEET_OPEN_ACCESS` | `false` by default; `true` only after the separate OPEN approval below |

6. Revoke access and replace the private environment values if credentials are exposed. An external consent screen in **Testing** issues refresh tokens lasting seven days for this Calendar scope; revocation and other account policies can invalidate them sooner. Reauthorization is an operational requirement, not a silently renewable permission. [Google refresh token expiration](https://developers.google.com/identity/protocols/oauth2#expiration).

## Optional OPEN access: separate organizer approval

Default setup leaves Google's access rules unchanged and does not call the Meet settings API. Personal-account meetings normally use Trusted access; participants without a Calendar invitation may need the organizer to admit them. [Google's access rules](https://support.google.com/meet/answer/9302870).

Before opting in, obtain explicit organizer approval for both consequences:

- OAuth also grants `https://www.googleapis.com/auth/meetings.space.settings`, which can see and edit settings for all the organizer's Meet calls. The implementation uses it only for the application-managed event whose private identifiers and schedule were verified.
- Application-managed meetings become `OPEN`: anyone holding or receiving the forwarded meeting link can join without knocking. Website membership checks restrict who receives the link from this app; they cannot prevent someone forwarding it.

After approval, enable **Google Meet API** in the same project and rerun the local helper with `--open-meet`, using a new private output file. The helper requests and checks both scopes, and writes `GOOGLE_MEET_OPEN_ACCESS=true`. Without that flag it requests Calendar only and writes `false`. Deploy the new consent token and flag together. Do not enable the flag with an old Calendar-only token.

For Calendar-created rooms, `meetings.space.created` is not the scope for changing their settings; `meetings.space.settings` is required. [Google's scope comparison](https://developers.google.com/workspace/meet/api/guides/meeting-spaces-overview), [scope capabilities](https://developers.google.com/workspace/meet/api/guides/authenticate-authorize).

When OPEN is requested, the provider resolves `spaces/{meetingCode}`, checks its canonical name and exact matching Meet URI/code, and updates only `config.accessType` with an explicit update mask. The returned space must confirm OPEN before the app receives `ready`. An existing OPEN setting is read again on subsequent requests. Denied, mismatched, unchanged or timed-out settings return `unavailable` with no URL, within the same twelve-second total budget. [Meet patch API](https://developers.google.com/workspace/meet/api/reference/rest/v2/spaces/patch).

Turning the application flag back to `false` stops setting OPEN; it does **not** close previously opened rooms. Reverting those settings requires an explicit organizer action. Calendar event deletion likewise must not be treated as proof that a previously shared Meet URL has become unusable.

## Server contract

Only import `src/features/meet/server/google-meet.ts` from server code. Its `server-only` marker prevents client imports. The testable core module is an internal implementation, not a public API route.

```ts
await ensureGoogleMeeting({ id, groupId, startsAt, endsAt });
// {status: 'ready', meetUrl: 'https://meet.google.com/…'}
// {status: 'pending' | 'unavailable', meetUrl: null}

await cancelGoogleMeeting({ id, groupId }); // boolean, retryable failure is false
```

Before calling either helper, authenticate the browser session and authorize the database row through the user's RPC. A group UUID, or the call UUID for an authorized language pair, supplies `groupId`; personal data is never used in the event title. Provider success does not grant membership or make a cancelled meeting accessible. Re-read the authorized database state after provider work; suppress a URL and cancel the provider event if the row became cancelled meanwhile. This also handles creation racing with cancellation. Never call this provider with arbitrary browser-supplied IDs and timestamps.

The provider first reads a deterministic event ID (database UUID without hyphens). Only a missing future event is inserted. A 409 conflict is read back. `createIfMissing: false` allows lookup only; expired meetings are always lookup only. Private metadata, event ID, start/end and the exact `https://meet.google.com/xxx-xxxx-xxx` URL are checked before returning a room. Token refresh is shared across concurrent calls in one process; event IDs also coordinate separate instances. This is retry-safe application behavior, not a claim of a global exactly-once transaction across Google and PostgreSQL.

Creation uses `conferenceDataVersion=1`, a unique request ID derived from the meeting UUID and a `hangoutsMeet` conference request. There are no attendees; reminders are disabled and updates use `sendUpdates=none`. [Insert API](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert), [event IDs and conference status](https://developers.google.com/workspace/calendar/api/v3/reference/events).

Each provider call has a total twelve-second deadline including token refresh. Missing configuration, revoked consent, network/Google errors, malformed responses and rejected conference creation return `unavailable` without a fabricated link or sensitive error body. A conference still being generated returns `pending`; the UI can refresh later. A failed conference is not silently replaced under a new event ID. Recovery may require organizer intervention or a new authorized database meeting.

Cancellation first reads the event and verifies the application's private meeting/group markers before deleting it with updates disabled. Already absent/deleted events are successful. The caller must already have confirmed cancellation in the database. Failed deletions need a subsequent authorized retry; this helper alone does not supply a background cleanup scheduler.

## Joining and verification

With default configuration, creating a Meet URL does not change Google's admission rules; participants may need the organizer to join or admit them. Optional OPEN is the explicit exception above, not a bypass of account/domain restrictions. The API's SpaceConfig does not expose the separate host-must-join-first UI switch. Verify actual admission with the organizer absent and two separate participants, including an anonymous Google-browser session, before claiming an autonomous video-call flow. Mocked OPEN responses do not establish successful real admission.

Local checks:

```powershell
npx tsx --test tests/server/google-meet.test.ts
npx tsc --noEmit
npx eslint src/features/meet/server tests/server/google-meet.test.ts scripts/google-oauth-local.mjs
node scripts/google-oauth-local.mjs --help
```

The automated tests use synthetic credentials and mocked HTTP responses: missing config, deterministic creation, concurrency, conflicts/lost responses, pending/failure, strict URL and metadata checks, timeout, lookup-only/history, managed cancellation, default-off OPEN, confirmed OPEN and denied/mismatched OPEN. Local callback tests verify state/PKCE and scope opt-in without Google consent. They never contact a real Google account. After provisioning, separately verify: authorized meeting creation, same URL after reload, unauthorized access denied before provider invocation, organizer/participant admission, cancellation and no invitation emails. Real-account verification must be recorded independently from the mock test results.
