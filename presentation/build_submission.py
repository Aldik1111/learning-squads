"""Package the reviewed deck and three submission destinations, without app secrets."""
from pathlib import Path
import hashlib
import html
import json
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parent
status = json.loads((root / "status.json").read_text(encoding="utf-8"))
if status.get("release_alignment_pending"):
    raise SystemExit("GROUPS-002 sources await deployment URL/SHA and reviewed PDF. Do not package the previous PDF as the new release.")
links = {
    "Рабочий сайт": status["live_url"],
    "Исходники рабочей ветки": status["source_url"],
    "Точный код deployment": status["deployed_source_url"],
    "Презентация — 9 слайдов": "learning-squads-pitch.pdf",
    "Заметки — 5 минут + вопросы": "speaker-notes.md",
    "Состояние и границы сдачи": "SUBMISSION.md",
}
items = "\n".join(f'<li><a href="{html.escape(url, quote=True)}">{html.escape(label)}</a></li>' for label, url in links.items())
page = f'''<!doctype html>
<html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Learning Squads — материалы сдачи</title>
<style>body{{font:20px/1.6 system-ui,sans-serif;max-width:850px;margin:60px auto;padding:0 24px;background:#f5f6ef;color:#163d35}}a{{color:#225e4f}}li{{margin:14px 0}}small{{display:block;overflow-wrap:anywhere}}p{{max-width:65ch}}</style>
<h1>Learning Squads</h1><p>Сайт, открытый код и английская презентация. Проверенный preview и готовность новой версии различаются; актуальные ограничения указаны в SUBMISSION.md. Дедлайн по подтверждению владельца: 15 ноября, 12:00 UTC+5.</p>
<ul>{items}</ul><small>Проверенный deployment: {html.escape(status["evidence_sha"])}</small>
<p>Ветка сдачи — codex/hackathon-release. Не подменять её текущим main с документацией. Открытие этого файла ничего не отправляет организаторам.</p></html>'''
(root / "submission-links.html").write_text(page + "\n", encoding="utf-8")
payloads = {name: (root / name).read_bytes() for name in (
    "learning-squads-pitch.pdf", "speaker-notes.md", "SUBMISSION.md", "submission-links.html"
)}
payloads["website.url"] = f'[InternetShortcut]\r\nURL={status["live_url"]}\r\n'.encode("utf-8")
payloads["source-branch.url"] = f'[InternetShortcut]\r\nURL={status["source_url"]}\r\n'.encode("utf-8")
manifest = {
    "stage": status["stage"], "date": status["date"],
    "deployment_sha": status["evidence_sha"],
    "live_url": status["live_url"], "source_url": status["source_url"],
    "deployed_source_url": status["deployed_source_url"],
    "remaining": status["pending"],
    "official_faq": status.get("official_faq"),
    "owner_confirmations": status.get("owner_confirmations"),
    "historical_evidence": status.get("historical_evidence"),
    "product_model": status.get("product_model"),
    "local_revision": status.get("local_revision"),
    "files": {name: {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()} for name, data in payloads.items()},
}
manifest_data = (json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
(root / "submission-manifest.json").write_bytes(manifest_data)
payloads["submission-manifest.json"] = manifest_data
destination = root / "learning-squads-submission.zip"
with ZipFile(destination, "w", ZIP_DEFLATED) as archive:
    for name, data in payloads.items():
        archive.writestr(name, data)
with ZipFile(destination) as archive:
    assert archive.testzip() is None
    assert set(archive.namelist()) == set(payloads)
    for name, expected in manifest["files"].items():
        assert hashlib.sha256(archive.read(name)).hexdigest() == expected["sha256"]
print(f"Submission ZIP PASS: {len(payloads)} files; checksum verification passed; {destination}")
