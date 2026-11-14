"""Validate authored content, not the application or an untrusted-code sandbox."""

import copy
import json
from pathlib import Path
import runpy
import sys


ROOT = Path(__file__).resolve().parent
EXPECTED_COURSES = {"python", "how-to-use-ai", "spanish", "python-automation", "ai-for-work", "french"}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def text(value):
    return isinstance(value, str) and bool(value.strip())


def referenced(base, name):
    require(text(name), f"Missing path in {base}")
    path = (base / name).resolve()
    require(path.is_relative_to(ROOT), f"Path escapes content: {name}")
    require(path.is_file(), f"Missing content file: {path}")
    return path


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def unique(items, label):
    require(all(text(item) for item in items), f"Empty {label}")
    require(len(items) == len(set(items)), f"Duplicate {label}")


def check_module(path, expected_id):
    module = read_json(path)
    require(module["id"] == expected_id, f"Module ID mismatch: {path}")
    require(type(module["contentVersion"]) is int and module["contentVersion"] > 0,
            f"Invalid content version: {path}")
    require(text(module["title"]) and text(module["level"]), f"Missing metadata: {path}")
    require(module["objectives"] and all(text(x) for x in module["objectives"]),
            f"Missing objectives: {path}")
    lesson = referenced(path.parent, module["lesson"])
    require(lesson.read_text(encoding="utf-8").startswith("# "), f"No lesson heading: {lesson}")
    questions = module["quiz"]
    require(len(questions) == 4, f"Each beginner module needs four quiz questions: {path}")
    ids = [q["id"] for q in questions]
    unique(ids, "question ID")
    answers = read_json(referenced(path.parent, module["answerKey"]))
    require(set(answers) == set(ids), f"Answer keys do not match quiz: {path}")
    for question in questions:
        require(text(question["prompt"]), f"Empty question: {question['id']}")
        options = question["options"]
        require(len(options) >= 2, f"Too few choices: {question['id']}")
        option_ids = [option["id"] for option in options]
        unique(option_ids, "option ID")
        require(all(text(option["text"]) for option in options), "Empty option text")
        answer = answers[question["id"]]
        require(answer["correctOptionId"] in option_ids, f"Unknown correct option: {question['id']}")
        require(text(answer["explanation"]), f"Missing feedback: {question['id']}")
    if "conversation" in module:
        conversation = module["conversation"]
        require(text(conversation["targetLanguage"]), "Missing conversation language")
        minutes = conversation["minimumPracticeMinutes"]
        require(type(minutes) is int and minutes > 0, "Invalid practice duration")
        guide = referenced(path.parent, conversation["guide"])
        require(text(guide.read_text(encoding="utf-8")), "Empty conversation guide")
    return module, ids


def check_task(base, module_id):
    task = read_json(referenced(base, "task.json"))
    require(set(task) == {"id", "version", "title", "description", "acceptanceCriteria"},
            f"Unexpected task fields: {base}")
    require(task["id"] == module_id + "-task", f"Task ID mismatch: {base}")
    require(type(task["version"]) is int and task["version"] > 0, f"Invalid task version: {base}")
    require(text(task["title"]) and text(task["description"]), f"Missing task instructions: {base}")
    criteria = task["acceptanceCriteria"]
    require(isinstance(criteria, list) and len(criteria) >= 2 and all(text(item) for item in criteria),
            f"Task needs concrete acceptance criteria: {base}")
    unique(criteria, "task acceptance criterion")
    return task["id"]


def same_value(actual, expected):
    # Match the browser runner's recursive type check: bool is not integer 1.
    if type(actual) is not type(expected):
        return False
    if isinstance(expected, list):
        return len(actual) == len(expected) and all(same_value(a, b) for a, b in zip(actual, expected))
    if isinstance(expected, dict):
        return actual.keys() == expected.keys() and all(same_value(actual[k], v) for k, v in expected.items())
    return actual == expected


def passing_cases(function, cases, preserve_input):
    passed = 0
    for case in cases:
        arguments = copy.deepcopy(case["args"])
        before = copy.deepcopy(arguments)
        try:
            actual = function(*arguments)
        except Exception:
            continue
        if (same_value(actual, case["expected"])
                and (not preserve_input or arguments == before)):
            passed += 1
    return passed


def check_exercise(path):
    exercise = read_json(path)
    require(text(exercise["id"]), "Missing exercise ID")
    require(type(exercise["exerciseVersion"]) is int and exercise["exerciseVersion"] > 0,
            "Invalid exercise version")
    require(type(exercise["preserveInput"]) is bool, "Invalid preserveInput flag")
    cases = exercise["cases"]
    require(len(cases) >= 6, "Exercise needs at least six meaningful cases")
    unique([case["id"] for case in cases], "case ID")
    for case in cases:
        require(text(case["label"]) and isinstance(case["args"], list), "Invalid case")
    starter = referenced(path.parent, exercise["starterFile"])
    reference = referenced(path.parent, exercise["referenceFile"])
    # Only repository-authored files are executed here. Never accept learner files.
    starter_fn = runpy.run_path(str(starter))[exercise["entrypoint"]]
    reference_fn = runpy.run_path(str(reference))[exercise["entrypoint"]]
    preserve = exercise["preserveInput"]
    require(passing_cases(reference_fn, cases, preserve) == len(cases), "Reference failed examples")
    require(passing_cases(starter_fn, cases, preserve) < len(cases), "Starter already solves exercise")
    # Every exercise must detect a correct answer obtained by destroying input.
    def modifies_first_input(*args):
        result = reference_fn(*args)
        args[0].clear()
        return result

    mistakes = {"changes input": modifies_first_input}
    if exercise["id"] == "python-count-completed":
        mistakes.update({
            "constant zero": lambda habits: 0,
            "counts all entries": len,
            "returns boolean": lambda habits: bool(sum(habits)),
            "returns after first entry": lambda habits: int(habits[0]) if habits else 0,
        })
    elif exercise["id"] == "python-keep-at-least":
        mistakes.update({
            "excludes exact boundary": lambda values, minimum: [x for x in values if x > minimum],
            "drops duplicates": lambda values, minimum: list(dict.fromkeys(x for x in values if x >= minimum)),
            "sorts instead of preserving order": lambda values, minimum: sorted(x for x in values if x >= minimum),
        })
    elif exercise["id"] == "python-summarize-scores":
        mistakes.update({
            "counts only positive scores": lambda scores: {"count": sum(x > 0 for x in scores.values()), "total": sum(scores.values())},
            "counts instead of summing": lambda scores: {"count": len(scores), "total": len(scores)},
            "extra output key": lambda scores: {"count": len(scores), "total": sum(scores.values()), "average": 0},
            "nested boolean instead of integer": lambda scores: {"count": bool(scores), "total": sum(scores.values())},
        })
    elif exercise["id"] == "python-normalize-labels":
        mistakes.update({
            "checks emptiness before cleaning": lambda labels: [x.strip().lower() for x in labels if x],
            "does not lowercase": lambda labels: [x.strip() for x in labels if x.strip()],
            "drops duplicates": lambda labels: list(dict.fromkeys(x.strip().lower() for x in labels if x.strip())),
            "removes internal spaces": lambda labels: [x.replace(" ", "").lower() for x in labels if x.strip()],
        })
    elif exercise["id"] == "python-group-minutes":
        mistakes.update({
            "overwrites repeated category": lambda records: {x["category"]: x["minutes"] for x in records},
            "drops zero-minute categories": lambda records: {k: v for k, v in reference_fn(records).items() if v},
            "normalizes exact keys": lambda records: {k.lower(): v for k, v in reference_fn(records).items()},
            "drops empty category": lambda records: {k: v for k, v in reference_fn(records).items() if k},
        })
    elif exercise["id"] == "python-report-lines":
        mistakes.update({
            "uses insertion order": lambda totals: [f"{k}: {v}" for k, v in totals.items()],
            "drops zero totals": lambda totals: [f"{k}: {totals[k]}" for k in sorted(totals) if totals[k]],
            "wrong separator": lambda totals: [f"{k}={totals[k]}" for k in sorted(totals)],
            "returns a single string": lambda totals: "\n".join(reference_fn(totals)),
        })
    else:
        raise ValueError(f"Missing incorrect-solution probes: {exercise['id']}")
    for label, function in mistakes.items():
        require(passing_cases(function, cases, preserve) < len(cases), f"{exercise['id']} cases miss: {label}")
    print(f"{exercise['id']}: {len(cases)} cases pass; starter and {len(mistakes)} incorrect variants rejected.")
    return exercise["id"]


def main():
    catalog = read_json(ROOT / "catalog.json")
    require(catalog["formatVersion"] == 1, "Unsupported proposed content format")
    require(text(catalog["locale"]), "Missing locale")
    courses = catalog["courses"]
    require({course["id"] for course in courses} == EXPECTED_COURSES, "Expected the six approved courses")
    unique([course["id"] for course in courses], "course ID")
    module_ids, question_ids, exercise_ids, task_ids = [], [], [], []
    for course in courses:
        require(text(course["title"]) and text(course["description"]), "Missing course title/description")
        require(len(course["modules"]) == 3, "Each approved course needs three modules")
        require(course.get("category") in {"programming", "languages", "ai"}, "Unknown course category")
        require(course.get("collaborationMode") in {"group", "language-partner", "self-paced"}, "Unknown collaboration mode")
        require(course["category"] != "languages" or course["collaborationMode"] == "language-partner",
                "Language courses use conversation partners, not course groups")
        for entry in course["modules"]:
            path = referenced(ROOT, entry["directory"] + "/module.json")
            module, ids = check_module(path, entry["id"])
            module_ids.append(module["id"])
            question_ids.extend(ids)
            task_ids.append(check_task(path.parent, module["id"]))
            require(("exercise" in module) == (course["category"] == "programming"),
                    "Each programming module needs a Python exercise; other categories do not")
            require(("conversation" in module) == (course["category"] == "languages"),
                    "Each language module needs a conversation guide; other categories do not")
            if "conversation" in module:
                expected_language = {"spanish": "es", "french": "fr"}[course["id"]]
                require(module["conversation"]["targetLanguage"] == expected_language, "Conversation target language mismatch")
                require(module["conversation"]["minimumPracticeMinutes"] == 15, "Each language module has 15 minutes of practice")
            if "exercise" in module:
                exercise_ids.append(check_exercise(referenced(path.parent, module["exercise"])))
    unique(module_ids, "catalog module ID")
    unique(question_ids, "global question ID")
    unique(exercise_ids, "exercise ID")
    unique(task_ids, "task ID")
    print(f"Content PASS: {len(courses)} courses, {len(module_ids)} modules, {len(question_ids)} questions, "
          f"{len(task_ids)} tasks, {len(exercise_ids)} Python exercises.")
    print("API, browser runner, progress, UI and deployment are NOT checked.")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, KeyError, TypeError, OSError) as error:
        print(f"Content FAIL: {error}", file=sys.stderr)
        sys.exit(1)
