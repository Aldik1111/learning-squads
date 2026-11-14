"""Generate the immutable first content migration before it has been applied."""
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
catalog = json.loads((root / "content/catalog.json").read_text(encoding="utf-8"))
statements = ["-- Published quiz versions are immutable. New content needs a new migration/version."]
for course in catalog["courses"]:
    for entry in course["modules"]:
        directory = root / "content" / entry["directory"]
        module = json.loads((directory / "module.json").read_text(encoding="utf-8"))
        keys = json.loads((directory / module["answerKey"]).read_text(encoding="utf-8"))
        quiz = [{**question, **keys[question["id"]]} for question in module["quiz"]]
        payload = json.dumps(quiz, ensure_ascii=False).replace("'", "''")
        module_id = module["id"].replace("'", "''")
        statements.append(f"insert into public.ls_content_versions(module_id,content_version,quiz) values ('{module_id}',{module['contentVersion']},'{payload}'::jsonb);")
destination = root / "supabase/migrations/202611140002_content.sql"
if destination.exists():
    raise SystemExit("Refusing to overwrite an existing migration. Add a new versioned migration instead.")
destination.write_text("\n".join(statements) + "\n", encoding="utf-8")
print("Prepared first content migration; no database was modified.")
