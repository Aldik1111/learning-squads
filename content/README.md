# Learning content and practical tasks

Six beginner courses contain three original English-language modules each. The first three modules were already integrated with the application; the 2026-11-15 expansion adds fifteen modules and a practical task for every module. Content validation is not proof that the expanded catalog has been migrated, exercised in a browser, or published. Release evidence belongs in `docs/demo.md`.

| Course | Modules | Practice |
| --- | --- | --- |
| Python | First function; list filters; dictionary summary | Six-case Python exercises, explanatory task results |
| How to use AI | Clear requests; verify answers; structured output | Original prompts, claim audits, extraction contracts |
| Spanish | First conversation; daily plans; preferences | One-to-one Spanish conversation guides |
| Python automation | Clean labels; group records; build a report | Pure Python transformations with edge cases |
| AI for work | Email; meeting actions; review workflow | Fictional drafts and human review records |
| French | First conversation; daily plans; preferences | One-to-one French conversation guides |

Python/AI courses use course groups. Language courses use a conversation partner and have no course group. Materials and checks are available without waiting for either. No paid AI account, provider integration, file-system access, or external automation is required for these lessons.

## Content format v1

`catalog.json` lists stable course/module IDs, descriptions, collaboration modes, and relative module directories. Each module contains:

- `module.json`: ID, content version, title, objectives, lesson path, four quiz questions, and optional exercise or conversation metadata.
- `lesson.md`: learner-facing Markdown. Render with raw HTML disabled; it is not MDX or executable content.
- `answers.json`: question ID to correct option ID and explanatory feedback. The server grades answers; do not import the key into the initial browser lesson payload.
- `task.json`: ID (`<moduleId>-task`), positive integer `version`, title, description, and concrete `acceptanceCriteria`. The loader derives course/module/content-version metadata from the catalog. Tasks are sibling files so published module JSON does not need an unrelated version change.
- Python: `exercise.json`, unfinished `starter.py`, and `authoring/reference.py`. The reference is trusted authoring material, never the learner's initial code. All exercises are deterministic pure functions over JSON-compatible inputs, preserve inputs, and include six examples.
- Languages: `conversation.md` and a `conversation` object with `targetLanguage` (`es` or `fr`) and `minimumPracticeMinutes: 15`.

Paths resolve relative to the containing file and must remain inside `content/`. Files are UTF-8. Preserve IDs; increment `contentVersion` when published module content changes, `exerciseVersion` when exercise behavior/cases change, and task `version` when a published task definition changes. Saved attempts and task results retain their original version interpretation. The expansion does not alter the three existing published lesson/module/answer/exercise files, including Spanish content version 2.

## Learning checks and task results

Quiz feedback reports correct counts and explanations; there is no pass threshold, attempt limit, forced order, or automatic completion rule. Public answer keys support learning rather than protected examinations. A Python self-check is client-executed practice, not a trusted assessment certificate.

A task asks for a written result summary and optionally an HTTPS artifact link. Neither a quiz score nor a timer automatically completes it. Results are private by default; sharing to a course group is an explicit action. Language courses have no group board. Learners should submit fictional examples and their own reflection, not private Meet links, another person's details, or recordings without permission. These are content instructions; server authorization and sharing controls are implemented and tested separately.

Each language module asks for at least 15 minutes of practice, accumulated across sessions under the approved rule. A participant's first Meet-link transition starts an interval; their explicit Finish action ends it. Completed intervals are combined without counting overlaps twice. This does not verify attendance or award course completion. Language settings are self-reported, not verified native-speaker or teaching credentials. The guides give a suggested agenda, not an attendance test.

## Local checks

From the repository root, with Python 3 and no third-party packages:

```sh
python content/validate.py
python scripts/check_repository.py
```

The content validator checks the six approved courses, three modules per course, 72 quiz questions, 18 task definitions, references, IDs, versions, answer coverage, and language targets. All six Python references must pass every case; every unfinished starter must fail at least one. Incorrect variants exercise boundary inclusion, duplicates/order, zeros, nested types, normalization, repeated-category accumulation, output formatting, and input preservation. The authoring check matches the browser runner's recursive value-type comparison.

Only trusted repository-authored Python starter/reference files execute here. This script is not a sandbox and must never be given learner-submitted Python. It does not check the API, migrations, browser isolation, persistence, UI, collaboration, or deployment. The backend separately creates immutable grading snapshots from these content files.

## Sources and editorial scope

Lessons link primary sources for the relevant language, Python, or AI-literacy material. Explanations, fictional scenarios, questions, task criteria, and conversation agendas are original. Python examples use established Python 3 features supported by the existing browser runner, not newly introduced standard-library APIs. AI lessons are tool-optional and make no claims of guaranteed accuracy or measured productivity gains.

Sources were reviewed on 2026-11-15: Python documentation, NIST's Generative AI profile, Anthropic's AI-fluency material, TV5MONDE, University of Kansas, and El Colegio de Mexico. The Instituto Cervantes curriculum returned a maintenance page during the expansion review; new Spanish grammar references therefore use the available primary teaching/dictionary sources. Existing published references are preserved. Linked resources can change independently of this repository.
