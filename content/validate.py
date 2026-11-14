"""Validate authored content, not the application or an untrusted-code sandbox."""

import copy
import json
from pathlib import Path
import runpy
import sys


ROOT = Path(__file__).resolve().parent


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
    require(questions, f"Empty quiz: {path}")
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


def passing_cases(function, cases, preserve_input):
    passed = 0
    for case in cases:
        arguments = copy.deepcopy(case["args"])
        before = copy.deepcopy(arguments)
        try:
            actual = function(*arguments)
        except Exception:
            continue
        # bool is a Python int subclass; True must not pass an expected integer 1.
        if (type(actual) is type(case["expected"]) and actual == case["expected"]
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
    require(cases, "Exercise needs cases")
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
    if exercise["id"] == "python-count-completed":
        # Regression probes: do the examples catch common beginner mistakes?
        def modifies_input(habits):
            total = sum(habits)
            habits.clear()
            return total

        mistakes = {
            "constant zero": lambda habits: 0,
            "counts all entries": len,
            "returns boolean": lambda habits: bool(sum(habits)),
            "returns after first entry": lambda habits: int(habits[0]) if habits else 0,
            "changes input": modifies_input,
        }
        for label, function in mistakes.items():
            require(passing_cases(function, cases, preserve) < len(cases), f"Cases miss: {label}")
        print(f"Python: {len(cases)} cases pass; starter and {len(mistakes)} incorrect variants rejected.")
    return exercise["id"]


def main():
    catalog = read_json(ROOT / "catalog.json")
    require(catalog["formatVersion"] == 1, "Unsupported proposed content format")
    require(text(catalog["locale"]), "Missing locale")
    courses = catalog["courses"]
    require(courses, "Empty course catalog")
    unique([course["id"] for course in courses], "course ID")
    module_ids, question_ids, exercise_ids = [], [], []
    for course in courses:
        require(text(course["title"]) and course["modules"], "Missing course title/modules")
        for entry in course["modules"]:
            path = referenced(ROOT, entry["directory"] + "/module.json")
            module, ids = check_module(path, entry["id"])
            module_ids.append(module["id"])
            question_ids.extend(ids)
            if "exercise" in module:
                exercise_ids.append(check_exercise(referenced(path.parent, module["exercise"])))
    unique(module_ids, "catalog module ID")
    unique(question_ids, "global question ID")
    unique(exercise_ids, "exercise ID")
    print(f"Content PASS: {len(courses)} courses, {len(module_ids)} modules, {len(question_ids)} questions.")
    print("API, browser runner, progress, UI and deployment are NOT checked.")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, KeyError, TypeError, OSError) as error:
        print(f"Content FAIL: {error}", file=sys.stderr)
        sys.exit(1)
