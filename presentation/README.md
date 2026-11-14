# Pitch PDF (T20)

Deliverable: `learning-squads-pitch.pdf`, **9 slides**, 16:9. Editable source: `build_deck.py`, `status.json`, the actual local catalog screenshot in `assets/`. Speaker notes and a two-minute Q&A preparation are in `speaker-notes.md` (Russian, 5-minute time budget).

This is a **draft** until the deployed guest scenarios and submission assets are verified. `status.json` contains the date, evidence/status text and nullable live URL. Do not replace it with a guessed URL or interpret code/tests as a successful deployment. The catalog screenshot was captured from the real local app on 2026-11-14; saved progress was unavailable in that separate browser session, and the screenshot is explicitly limited to the public catalog.

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

2026-11-14 status refresh: cloud Supabase migrations001–007 and the full integration script with five QA guest accounts passed; local UI, learning and Python persistence/reload checks passed. The evidence slide and speaker notes now reflect those results. Vercel publication still awaits GitHub integration, with published two-guest/real Meet acceptance and deadline timezone outstanding. The PDF was regenerated, all nine pages rendered and the updated evidence slide inspected at full size; layout remained clear. It remains a draft and contains no guessed public URL.
