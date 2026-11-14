# Владение файлами

A = @Aldik1111, B = @bigstep832.

| Область | Владелец |
|---|---|
| src/app/(public)/**, src/app/(product)/** | A |
| src/app/layout.tsx, src/app/globals.css | A после bootstrap |
| src/components/**, src/features/*/ui/** | A |
| content/**, tests/e2e/**, docs/mvp.md, docs/demo.md, presentation/** | A |
| src/app/api/**, src/features/*/server/** | B |
| src/features/python-runner/** целиком | B |
| src/contracts/**, src/lib/** | B |
| supabase/**, tests/server/**, tests/runner/**, tests/fixtures/** | B |
| package.json, lock-файл, конфигурация, scripts/**, .github/** | B |
| README.md, docs/contracts.md, docs/decisions.md, docs/ownership.md | B |

До начала кода B создаёт небольшой bootstrap и передаёт UI-файлы A. Все пути исходников пока запланированы: приложение ещё не создано.
Нужна новая зависимость — A запрашивает B. PythonExercise принадлежит B, A подключает его через согласованный интерфейс.
Вне таблицы: договориться в Issue до изменения. Оба могут просматривать все файлы.
Распределение не является файловым ограничением GitHub: Write-доступ действует на репозиторий, дисциплина и ревью предотвращают конфликты.
