# Настройка репозитория

Проверено 14.11.2026. Это состояние рабочей ветки, не слияние в main и не окончательная приёмка Production.

## Репозиторий и команда

- Публичный [Aldik1111/learning-squads](https://github.com/Aldik1111/learning-squads), default branch `main`.
- A/владелец: `Aldik1111`. B: `bigstep832`; повторная проверка GitHub API подтвердила `permission=write`, `role_name=write`, ожидающих приглашений нет. Ранее отправленное приглашение больше не pending. B назначен в Assignees #1, #2, #4, #7, #9, #11, #13, #15, #17, #19 и в #18 для независимой приёмки; остальные исполнители сохранены. GitHub CODEOWNERS errors для рабочей ветки вернул пустой список, backend/infrastructure patterns указывают B. Автоматическое назначение review не проверялось созданием PR.
- Реализация находится в `codex/a-learning-modules`; проверенный опубликованный SHA `d922e3ce6cf1dd19bb680c646e19432ed30ce29e`. Main не изменён, новая PR не создавалась. По решению владельца PR открывается только перед слиянием.
- После проверки первого Preview и обязательных app checks закрыты 16 задач реализации: #1–#14, #16 и #17. В каждой есть доказательства и ограничения; закрытие задачи в ветке не означает merge или приёмку внешней видеосвязи.

## Проверки и защита main

Настоящий [Application checks на d922e3c — SUCCESS](https://github.com/Aldik1111/learning-squads/actions/runs/43610530353): `npm ci`, typecheck, lint, unit, content validation, SQL/concurrency на чистой БД со всеми семью миграциями, production build. Команды воспроизведения — в [README](../README.md). `Repository hygiene` проверяет структуру и не заменяет приложение.

14.11.2026 в рамках согласованной настройки репозитория добавлен обязательный `Application checks`, сохранён обязательный `Repository hygiene`. После PATCH только `required_status_checks` GitHub API подтвердил:

- required contexts: `Repository hygiene`, `Application checks`;
- strict status checks: `true`;
- required approving reviews: `1`, dismiss stale reviews: `true`;
- enforce admins: `true`.

Все остальные поля защиты сравнены до/после и остались неизменными. Защита не обходилась; это не разрешение слияния без PR/review.

## Supabase и первый публичный Preview

Создан отдельный Supabase Learning Squads, anonymous sign-in включён, миграции001–007 применены и проверены. [Журнал облака](cloud-setup.md) фиксирует проект, проверки и ограничения ручной истории миграций. Приложение использует публичные URL/key; административные ключи и окружение в Git не добавлялись.

[Публичный Preview](https://learning-squads-luuljvgfs-aldik1111.vercel.app) Vercel READY для SHA `d922e3ce6cf1dd19bb680c646e19432ed30ce29e`. В свежем браузерном контексте без входа владельца Vercel проверены открытие приложения, создание гостя, сохранение профиля и восстановление после reload. Полный опубликованный smoke фиксируется отдельно в [протоколе приёмки](demo.md), а не выводится из статуса READY.

Локальная разработка имеет собственный Supabase; текущий Preview подключён к выделенному облачному Learning Squads. Первое автоматически созданное окружение Vercel Production без переменных не принято как готовая сдача. Production не настроен и не проверен полностью; раздельные подключения Preview/Production и база сдачи требуют окончательной настройки в #19. Не переносить Preview-переменные в Production автоматически. Настоящая внешняя встреча Meet и итоговая пользовательская приёмка остаются отдельными проверками #18.
