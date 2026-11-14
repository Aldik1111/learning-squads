"""Dependency-free repository foundation check; does NOT test the application."""
from pathlib import Path
import subprocess
import sys

root = Path(__file__).resolve().parents[1]
required = [
    "README.md", "AGENTS.md", "CONTRIBUTING.md", ".env.example",
    "docs/mvp.md", "docs/ownership.md", "docs/contracts.md",
    "docs/decisions.md", "docs/plan.md", "docs/demo.md",
    "docs/developer-a.md", "docs/developer-b.md", ".github/CODEOWNERS",
    ".github/PULL_REQUEST_TEMPLATE.md",
]
errors = [f"Missing required file: {name}" for name in required if not (root / name).is_file()]
tracked = subprocess.check_output(
    ["git", "ls-files", "-z"], cwd=root
).decode("utf-8").split("\0")
text_extensions = {".md", ".yml", ".yaml", ".json", ".py", ".ts", ".tsx", ".js", ".mjs", ".css", ".html"}
for name in filter(None, tracked):
    path = Path(name)
    if (path.name == ".env" or path.name.startswith(".env.")) and path.name != ".env.example":
        errors.append(f"Tracked environment file: {name}")
    if any(part in {"node_modules", ".next", ".vercel", ".venv"} for part in path.parts):
        errors.append(f"Tracked local/build directory: {name}")
    if path.suffix not in text_extensions:
        continue
    try:
        content = (root / path).read_text(encoding="utf-8")
    except UnicodeDecodeError:
        errors.append(f"Non UTF-8 text: {name}")
        continue
    if any(line.startswith(("<<<<<<< ", ">>>>>>> ")) for line in content.splitlines()):
        errors.append(f"Unresolved merge marker: {name}")
    if not content.endswith("\n"):
        errors.append(f"Missing final newline: {name}")
if errors:
    print("\n".join(errors))
    sys.exit(1)
print("Repository foundation PASS. Application, API and deployment are NOT tested by this check.")
