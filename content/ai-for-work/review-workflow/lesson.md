# Build a small human review workflow

A reusable AI-assisted workflow needs a way to notice when its draft is wrong. Begin with a narrow task, such as turning a fictional event brief into a public announcement. Define the evidence a reviewer needs before calling the draft usable.

## Make a review checklist observable

For this exercise, use four checks: every factual claim is supported by the brief; unknown details remain unknown; the requested format is followed; the next step is clear. "Sounds professional" may be useful feedback, but it is too broad to replace these checks.

Test two fictional briefs. Normal case: "Reading club, Saturday 11:00, online, sign-up required." Missing-data case: "Reading club, Saturday; time and meeting link are undecided." A draft that invents an 11:00 time in the second case fails the source-support check even if its formatting is perfect.

Keep a small record: input, candidate draft, checks passed/failed, correction, and human decision. A count such as 3/4 is a summary of this checklist, not a calibrated accuracy measure or a promise about future inputs. Do not hide a factual failure inside an average score. Revise and recheck the failing claim.

## Practice

Write two candidate announcements for the briefs above, deliberately introduce one unsupported detail, and use the checklist to catch it. Correct the draft and record why a reviewer would approve or return it. Include a stop condition: when a required fact is missing, ask the organizer rather than publish a guess.

No integration or paid provider is needed. The workflow can be practiced manually with the supplied examples. If using AI, use fictional material and keep publication as a separate human action. Your practical result is the review record and corrected draft, not an automated claim of completion.

## Sources

- [NIST: Generative AI risk-management profile](https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence)
