# First learning modules (T06)

Three original English-language beginner modules for the hackathon: Python, How to use AI, and Spanish. Content is authored and locally checkable; it is not yet connected to an application. Titles, level and lesson scope are proposed editorial choices for review, not new product requirements.

## Proposed content format v1 — pending T02 review

`catalog.json` lists course/module IDs and relative directories. Each directory contains:

- `module.json`: stable ID, content version, title, objectives, lesson path, quiz and optional exercise or conversation activity.
- `lesson.md`: learner-facing Markdown. Render as text/Markdown with raw HTML disabled; no MDX or executable content is needed.
- `answers.json`: question ID → correct option ID and explanatory feedback, loaded by the server when grading. Do not import into the browser's initial lesson payload.
- Python only: `exercise.json`, `starter.py` and public example cases. `authoring/reference.py` is an authoring check, not the learner's starting code.

Paths resolve relative to their containing catalog/module/exercise file and must remain in `content/`. Content is UTF-8. IDs remain stable when prose changes; increment `contentVersion` for a changed published module and `exerciseVersion` for changed exercise behavior/cases. Saved attempts need both the ID and version; older attempt records must retain their original interpretation.

This directory does not define the API or the runner component. B owns the final contracts in T02, API scoring in T07, Python isolation in T09 and progress rules. Adapt this proposal once T02 is agreed. A course currently has one authored module; the catalog supports adding more module entries without renaming existing IDs.

Quiz questions have one correct option. Return counts and feedback; there is deliberately no pass threshold, retry limit, forced order or automatic completion rule. The public repository contains the answer keys: these are learning checks, not a protected examination. Server-side grading avoids trusting submitted scores, not access to the public answers.

The Spanish activity proposes at least 15 minutes of practice for this module. The timer is only time since the Meet-link transition; neither the activity nor its duration proves attendance or awards completion. Whether sessions accumulate remains open in #21. Materials and questions must work without a team or partner.

## Local authoring checks

Run from the repository root with Python 3 (no packages or external services):

```sh
python content/validate.py
python scripts/check_repository.py
```

The first checks references, unique IDs, answer coverage, versions and Python examples against the authored reference. It also checks that unfinished and intentionally broken examples fail. It executes only the repository's trusted reference file: it is **not a sandbox**, an application runner or permission to execute submitted learner code on the server. CI integration belongs to B.

Sources are linked in the lessons. Examples and questions are original. Source links were reviewed on 2026-11-14. This package adds no paid services or AI-provider dependency.
