# Learning Squads submission package (T20)

**GROUPS-002 source revision in progress.** Editable slides, notes and status now describe the new locally implemented model. The PDF, ZIP and manifest are still the previous 5ad4 package; they have deliberately not been regenerated or relabelled as a new deployment. `release_alignment_pending=true` blocks ZIP generation until the final URL/SHA, scoped checks and reviewed PDF are aligned. The existing plans screenshot remains explicitly historical 5ad4 evidence.

New model: Python and AI receive automatically numbered groups of up to four, matched on shared weekly availability, with one active group per course and members-only chat, aggregate progress and calendar. Schedule changes can trigger rematching while retaining personal progress. Spanish has no course groups: available primary-Spanish speakers are paired one-to-one; language is self-reported. Server-created Meet and optional OPEN are local implementations, not verified published calls. OPEN is default off and needs separate organizer consent.

Deliverables: `learning-squads-pitch.pdf` — **9 English slides**, 16:9 — and `learning-squads-submission.zip`. Editable sources: `build_deck.py`, `status.json`, the genuine plans screenshot in `assets/published-plans-5ad4.png`. Russian `speaker-notes.md` schedules five minutes plus two minutes of questions. `SUBMISSION.md` maps the official FAQ, materials and acceptance limits; `submission-links.html` opens the three destinations.

## Current release and evidence

Primary site: [release5ad4](https://learning-squads-1tdad607u-aldik1111.vercel.app). Source: [codex/hackathon-release](https://github.com/Aldik1111/learning-squads/tree/codex/hackathon-release), [exact deployment SHA](https://github.com/Aldik1111/learning-squads/tree/5ad4ca97ac50678d61104cf0937875b3ccf94cf5). Main currently contains documentation; do not substitute it for the application branch.

Root narrowly verified anonymous profile save/reload, /plans $19 demo confirmation and the visible judge guide around21:14 UTC+5 on2026-11-14. [CI43614225449](https://github.com/Aldik1111/learning-squads/actions/runs/43614225449) passed typecheck/lint/unit/content/SQL/build on5ad4. These are not full new-release browser acceptance.

Historical deployment d922e3c: [older preview retained for B](https://learning-squads-luuljvgfs-aldik1111.vercel.app). Profiles A/B, quiz4/4, actual Python6/6, persistence/reload/dashboard, squad join/invite/accept/read passed there at15:34–15:38 UTC. Python succeeded on its first attempt. These results are recorded separately in `status.json.historical_evidence` and are **not** relabelled as5ad4 results. Actual external Meet was not opened. Earlier local Next.js/cloud DB checks include natural ten-minute expiry; that is not claimed as a new-release browser run.

The latest B report in #18 concerns local a67913f and the obsolete project-2k6he alias (503 and two local runtime-download failures). It does not independently accept the new release. #18 was closed on explicit user instruction with incomplete criteria noted. Closure is not acceptance evidence. Real Meet, independent B acceptance, full current-release checks and captain submission remain outstanding; the deck retains a submission-draft footer.

## Build and package

Before finalizing this revision, supply the new deployment URL, exact SHA and source branch; separate its observed checks from local and historical evidence in `status.json`. Update slides 4/5/9 and notes to those facts, build/render/review the PDF, then set `release_alignment_pending=false` and rebuild the ZIP. Do not remove real-Meet or independent-acceptance caveats without evidence.

Use Python with ReportLab and Arial or DejaVu Sans (or `LEARNING_SQUADS_FONT_DIR`). No application dependencies are changed.

```sh
python presentation/build_deck.py
python presentation/build_submission.py
pdfinfo presentation/learning-squads-pitch.pdf
pdftoppm -r 72 -png presentation/learning-squads-pitch.pdf /tmp/learning-squads-slide
```

The ZIP has seven entries: PDF, notes, SUBMISSION.md, HTML links, website.url, source-branch.url and a manifest. The manifest checks each included file's SHA256 and separates current deployment from historical QA. No application secrets, environment files or source-code copy are packaged. Rebuild the ZIP after every PDF/document change. Temporary renders stay outside Git.

## Claim boundaries

- The selected audience is working US adults aged25–45, not a validated market-size result. Acquisition, demand and retention are hypotheses; no interviews, traction or revenue are invented.
- The owner approved a **$19/month demo hypothesis** on2026-11-14: no charges, all current MVP features free. The screen and confirmation are published/narrowly checked on5ad4. This is not an actual purchase or a feature gate; full strict-paywall compliance is not claimed.
- Illustrative model: gross margin80%, monthly retention90% (churn10%), $400 acquisition /10 hypothetical paying users = CAC$40. LTV = $19 ×80% /10% = $152; LTV/CAC=3.8. These are scenario inputs, not measured economics.
- $100m ARR requires `ceil(100000000/(12*19)) = 438597` paying users. This is arithmetic, not a forecast. The simplified LTV model assumes stable churn/economics and excludes expansion, discounting and fixed-cost allocation.
- Workflow comparison is not a competitor audit. Language is self-reported; elapsed Meet-link time is not attendance proof; the guest profile may be shared.

## Official FAQ and owner decisions

Source: local **Business Cup 2.0 _ FAQ по кейсу.pdf**. Its exact Unicode filename and SHA256 are in `status.json.official_faq`; the source PDF is not redistributed in the ZIP.

- Q70 p15: 15 November12:00 deadline, no timezone. The owner confirmed **Kazakhstan UTC+5** on14 November; this is not attributed to the organizers' FAQ.
- Q73 p15: site availability through the end of the final on15 November. A current HTTP200 does not prove future uptime.
- Q75–Q76 p16: English UI/PDF; oral RU/KZ/EN allowed; five-minute pitch plus two-minute questions, screenshots/flow in the deck.
- Q81 p17: maximum10 slides including cover/appendices; price/CAC/retention/LTV with a source or understandable assumptions. This deck has9 and labels hypothetical inputs.
- Q82 p17: **the captain uses the submission link received by email** to submit PDF, product URL and public GitHub. This does not mean emailing the files. The form URL was not provided and no submission was made; ZIP support is not assumed.
- Q137 pp26–27: real payments optional, minimum clear-price paywall screen. The approved nonblocking demonstration leaves all features free; strict feature-gating compliance is not asserted.

The owner also approved all three first beginner modules with no pass threshold or attempt limit. Source/limits are documented in SUBMISSION.md and status.json; this package does not alter business rules.

## Validation

The following paragraph records the **previous 5ad4 artifact review**, not a review of the newly edited GROUPS-002 sources. The new PDF/ZIP render and final-link checks are pending deployment alignment.

All three new public destinations returned HTTP200 in unauthenticated GET checks. PDF links target the new site and application release branch. ReportLab output has9 pages; extracted slide text contains no Cyrillic. All nine slides were rendered and visually reviewed, with full-size inspection of the new screenshot and status slides. The full original plans capture is retained; its layout crop does not fabricate UI. Older home/catalog images remain historical assets and are not used by the deck. ZIP integrity and every SHA256 were checked; its PDF matches the reviewed PDF. `git diff --check` passed. Package generation does not close #20 or submit to organizers.
