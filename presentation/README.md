# Pitch PDF (T20)

Deliverable: `learning-squads-pitch.pdf`, **9 slides**, 16:9. Editable source: `build_deck.py`, `status.json`, the actual local catalog screenshot in `assets/`. Speaker notes and a two-minute Q&A preparation are in `speaker-notes.md` (Russian, 5-minute time budget).

This remains a **draft for acceptance** until real Meet access, independent acceptance by developer B and submission conditions are confirmed. The public preview and the guest scenarios described below have been checked. `status.json` contains the exact tested deployment SHA, evidence/status text and verified live URL. Do not replace it with a guessed URL or transfer results to a different deployment. The catalog screenshot was captured from the real local app on 2026-11-14; saved progress was unavailable in that separate historical browser session, and the screenshot is explicitly limited to the public catalog.

## Rebuild

Use Python with `reportlab`; this does not change application dependencies. Arial or DejaVu Sans font files must be installed (or set `LEARNING_SQUADS_FONT_DIR`).

```sh
python presentation/build_deck.py
pdfinfo presentation/learning-squads-pitch.pdf
pdftoppm -r 72 -png presentation/learning-squads-pitch.pdf /tmp/learning-squads-slide
```

The Codex bundled Python includes ReportLab and pypdf. The source rejects overflowing text boxes where a fixed height is specified. Re-render and inspect all nine slides after editing, including the evidence slide. Intermediate renders belong in a temporary directory, not in Git.

## Claim boundaries

- The target audience is the owner's chosen segment, not a validated market-size result.
- Problem, acquisition, retention and subscription statements are hypotheses/planned experiments. No user interviews, traction, conversion, retention, revenue, CAC or LTV measurements are invented.
- The workflow comparison describes approaches to organizing learning, not audited claims about named competitors.
- $100 million ARR is an ambition scenario required by the hackathon framing. The table uses `N = ceil(100000000 / (12 × monthly_price))`: $10 → 833,334; $20 → 416,667; $30 → 277,778. These are illustrative inputs, not approved prices or a sales forecast.
- The simplified lifetime gross-margin model is `LTV ≈ monthly_ARPU × gross_margin / monthly_churn`. It assumes stable monthly economics/churn and excludes expansion, discounting and fixed-cost allocation. All variables need measurement. The target is `LTV > CAC`, not a claimed achieved ratio.
- Availability is self-reported, the Meet link is real/manual, and elapsed link time is not attendance proof. The current guest model permits shared browser use.

No external market statistics are used. Product rules come from the existing repository decisions; readiness must be refreshed from the actual tested/deployed SHA before final submission. No task or PR is closed by generating this PDF.

## Validation record

2026-11-14: PDF generated with ReportLab 4.4.9; `pdfinfo` confirms 9 unencrypted 1280×720 pages, no JavaScript. All nine pages rendered with Poppler and visually inspected as a contact sheet plus full-size dense pages. No overlaps, cropped content or missing Cyrillic glyphs observed. The speaker-note allocations sum to 300 seconds. Final deployment/guest acceptance remains root's check.

2026-11-14 public-preview refresh, deployed SHA `d922e3ce6cf1dd19bb680c646e19432ed30ce29e`: [verified public site](https://learning-squads-luuljvgfs-aldik1111.vercel.app) opens in fresh browsers without Vercel authentication. Profiles A/B save and reload; quiz4/4 and Python6/6 execute, save, reload and appear in dashboard. Python succeeded on the first published attempt, without a CDN retry. At 15:38 UTC, B created a QA Spanish squad, A joined, B invited A, A accepted/marked read, and both profiles restored the states after reload. The actual external Meet room was not opened.

Earlier evidence at SHA `a67913f7271702ab280a9e578e12d6673da81afe` includes cloud Supabase001–007/API checks with five QA guests and local Next.js/cloud DB checks of three guests and natural ten-minute expiry. That expiry run is not claimed for the published URL. An earlier cold CDN download failed and recovered on retry; CDN availability remains an external dependency.

The updated PDF was regenerated, all nine pages rendered and the changed evidence slide inspected at full size, including its live hyperlink; layout remained clear. Real Meet, independent developer B acceptance and deadline timezone/submission confirmation remain outstanding. The deck therefore remains a draft despite the verified public preview.
