# Learning Squads submission package (T20)

Nine English slides, five-minute Russian speaker notes plus two-minute Q&A, and a ZIP with seven files. Editable sources: `build_deck.py`, `status.json`, `speaker-notes.md`. `SUBMISSION.md` records submission requirements and evidence limits.

## Published release

Site: https://learning-squads-git-codex-hackathon-release-aldik1111.vercel.app (mutable branch alias, not an immutable deployment URL)

Application branch: https://github.com/Aldik1111/learning-squads/tree/codex/hackathon-release

Exact code: https://github.com/Aldik1111/learning-squads/tree/bea9c82bd264e5cfe34f10ad28cb8e32ff69fccb

Current UI release bea9c82 is deployed successfully. Scoped public UI smoke PASS at15Nov00:37–00:39 UTC+5: three real courses/filters/aria-pressed, Python draft retention and anchors, 320px profile/no overflow, profile GET200 and enabled form, plans dialog/Escape, new homepage. No quiz submissions, profile writes, external Meet or Python runtime execution were repeated. Console: zero errors, minor unused CSS preload warnings. CI https://github.com/Aldik1111/learning-squads/actions/runs/43632996212 completed successfully: typecheck, lint, unit, content, SQL and build.

Previous release 0afb9b4: root verified Vercel Ready and CI success: https://github.com/Aldik1111/learning-squads/actions/runs/43628081290 . Published scoped browser checks PASS: two fresh profiles save/reload; UTC weekly availability places both in one Python group; real group calendar URL survives reload; Spanish has no group enrollment and creates a ready partner call. Spanish request/accept passed with real ready URL stable after reload and join button enabled. QA availability was switched off and saved. External Meet, timer, full quiz/Python and broad B acceptance were not rerun on this deployment. Initial page load timed out, then recovered on retry; no mocked responses.

## Model and evidence

GROUPS-002: Python and AI have automatically numbered groups of up to four, one active group per course, matched on shared availability. Members-only chat, aggregate progress and calendar; incompatible schedule changes trigger rematching while retaining personal progress. Spanish has no course groups: one-to-one matching with an available self-reported primary Spanish speaker.

Local Next.js app against local Supabase009: real group/Spanish Meet URLs remained stable after reload. A signed-in non-organizer joined without the creator, camera/microphone off. Two anonymous contexts and a retry were denied: participants should sign in to Google. Two-way audio/video and fifteen-minute participation were not tested. Root reported 28/28 unit tests, SQL concurrency and build PASS, cloud008/009 applied and RLS on eight checked tables. These local checks are not relabelled as deployed browser checks.

Historical 5ad4: profile save/reload, $19 demo and judge guide checked. Slide4 now shows the real published bea9c82 homepage; the old plans image remains only as an historical asset. Historical d922: quiz4/4, real Python6/6, persistence and two-guest flow passed. Full records are separated in status.json. Independent B acceptance and captain submission remain outstanding; issue closure does not establish acceptance.

## Build and validation

Use Python with ReportLab and Arial/DejaVu Sans. No application dependencies are changed.

```sh
python presentation/build_deck.py
python presentation/build_submission.py
pdfinfo presentation/learning-squads-pitch.pdf
pdftoppm -r 72 -png presentation/learning-squads-pitch.pdf /tmp/learning-squads-slide
```

Update the URL/SHA and scoped evidence first. Build and visually review all nine pages, then clear `release_alignment_pending` and build the ZIP. Its manifest verifies file SHA256 values and separates deployment, local and historical evidence. Never package an old PDF as a newly verified release. Secrets, environment files, personal organizer details and private QA room URLs are excluded.

## Claim boundaries

Audience: working US adults25–45; demand and retention are hypotheses. No invented interviews, users or revenue. The $19/month offer is an owner-approved demo with no charge and all MVP features free; strict paywall compliance is not claimed.

Illustrative economics: gross margin80%, monthly retention90%/churn10%; $400 acquisition /10 hypothetical paying users gives CAC$40. LTV = $19 x80% /10% = $152; LTV/CAC=3.8. $100m ARR would require438597 payers at$19/month. These are assumptions and arithmetic, not observations or a forecast.

Language is self-reported. Browser profiles can be shared. Time after opening Meet is not attendance proof. Actual admission checks do not imply verified two-way media or anonymous access.

## Official FAQ and owner decisions

Source: local **Business Cup 2.0 _ FAQ по кейсу.pdf**. Its exact Unicode filename and SHA256 are in `status.json.official_faq`; the source PDF is not redistributed in the ZIP.

- Q70 p15: 15 November12:00 deadline, no timezone. The owner confirmed **Kazakhstan UTC+5** on14 November; this is not attributed to the organizers' FAQ.
- Q73 p15: site availability through the end of the final on15 November. A current HTTP200 does not prove future uptime.
- Q75–Q76 p16: English UI/PDF; oral RU/KZ/EN allowed; five-minute pitch plus two-minute questions, screenshots/flow in the deck.
- Q81 p17: maximum10 slides including cover/appendices; price/CAC/retention/LTV with a source or understandable assumptions. This deck has9 and labels hypothetical inputs.
- Q82 p17: **the captain uses the submission link received by email** to submit PDF, product URL and public GitHub. This does not mean emailing the files. The form URL was not provided and no submission was made; ZIP support is not assumed.
- Q137 pp26–27: real payments optional, minimum clear-price paywall screen. The approved nonblocking demonstration leaves all features free; strict feature-gating compliance is not asserted.

The owner also approved all three first beginner modules with no pass threshold or attempt limit. Source/limits are documented in SUBMISSION.md and status.json; this package does not alter business rules.

## Artifact validation

Final PDF: nine English pages rendered and visually reviewed, with detailed review of new published-homepage/status slides. Clickable links target the mutable release-branch site alias and exact code SHA. ZIP integrity and file SHA256 values checked after generation. These artifact checks do not replace application acceptance or submit materials to organizers.
