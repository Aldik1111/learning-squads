# Настройка репозитория

Проверено 14.11.2026. Это состояние рабочей ветки и проверенного Preview, не слияние в main. Отдельный Vercel Production не требуется для сдачи по критерию #19.

## Последний выпуск GROUPS-002

Актуальный сайт — [release v0.4](https://learning-squads-hvmrsg0mj-aldik1111.vercel.app), SHA `0afb9b446a7004fdf49824aa3c4bf5454343fac7`, ветка `codex/hackathon-release`. Vercel Ready и [Application checks](https://github.com/Aldik1111/learning-squads/actions/runs/43628081290) подтверждены. В Supabase применены 008–009, проверены RLS восьми новых таблиц и cleanup RPC. Google Calendar/Meet подключены; пять Google Secret и две публичные Supabase-переменные ограничены Preview этой release-ветки. Протокол новых браузерных проверок и его границы — [demo.md](demo.md); детали облака — [cloud-setup.md](cloud-setup.md).

Новый PR не создавался, main и его защита не менялись. Документ подготовлен в рабочей ветке; пункт #22 о его принятии через обычный PR ещё не закрыт. Ниже — историческая настройка и доказательства предыдущих выпусков, не текущий адрес сдачи.

## Репозиторий и команда

- Публичный [Aldik1111/learning-squads](https://github.com/Aldik1111/learning-squads), default branch `main`.
- A/владелец: `Aldik1111`. B: `bigstep832`; повторная проверка GitHub API подтвердила `permission=write`, `role_name=write`, ожидающих приглашений нет. Ранее отправленное приглашение больше не pending. B назначен в Assignees #1, #2, #4, #7, #9, #11, #13, #15, #17, #19 и в #18 для независимой приёмки; остальные исполнители сохранены. GitHub CODEOWNERS errors для рабочей ветки вернул пустой список, backend/infrastructure patterns указывают B. Автоматическое назначение review не проверялось созданием PR.
- Реализация находится в `codex/a-learning-modules`; исторический SHA полной опубликованной проверки `d922e3ce6cf1dd19bb680c646e19432ed30ce29e`; текущий release `5ad4ca97ac50678d61104cf0937875b3ccf94cf5` прошёл отдельную узкую проверку ниже. Main не изменён, новая PR не создавалась. По решению владельца PR открывается только перед слиянием.
- После проверки первого Preview и обязательных app checks закрыты 16 задач реализации: #1–#14, #16 и #17. В каждой есть доказательства и ограничения; закрытие задачи в ветке не означает merge или приёмку внешней видеосвязи. Дополнительно B закрыл #18 по прямому поручению пользователя с явным указанием, что полная независимая приёмка и настоящая Meet-связь не подтверждены: [комментарий B](https://github.com/Aldik1111/learning-squads/issues/18#issuecomment-6880056822). Статус CLOSED этой карточки не считается доказательством устранения её прежних замечаний.

## Проверки и защита main

Настоящий [Application checks на d922e3c — SUCCESS](https://github.com/Aldik1111/learning-squads/actions/runs/43610530353): `npm ci`, typecheck, lint, unit, content validation, SQL/concurrency на чистой БД со всеми семью миграциями, production build. Команды воспроизведения — в [README](../README.md). `Repository hygiene` проверяет структуру и не заменяет приложение. Текущий [Application checks release5ad4ca9 — SUCCESS](https://github.com/Aldik1111/learning-squads/actions/runs/43614225449) подтверждён отдельно; он не подменяет узкий браузерный протокол нового выпуска.

14.11.2026 в рамках согласованной настройки репозитория добавлен обязательный `Application checks`, сохранён обязательный `Repository hygiene`. После PATCH только `required_status_checks` GitHub API подтвердил:

- required contexts: `Repository hygiene`, `Application checks`;
- strict status checks: `true`;
- required approving reviews: `1`, dismiss stale reviews: `true`;
- enforce admins: `true`.

Все остальные поля защиты сравнены до/после и остались неизменными. Защита не обходилась; это не разрешение слияния без PR/review.

## Supabase и первый публичный Preview

Создан отдельный Supabase Learning Squads, anonymous sign-in включён, миграции001–007 применены и проверены. [Журнал облака](cloud-setup.md) фиксирует проект, проверки и ограничения ручной истории миграций. Приложение использует публичные URL/key; административные ключи и окружение в Git не добавлялись.

[Исторический публичный Preview](https://learning-squads-luuljvgfs-aldik1111.vercel.app) Vercel READY для SHA `d922e3ce6cf1dd19bb680c646e19432ed30ce29e`. В свежем браузерном контексте без входа владельца Vercel проверены открытие приложения, создание гостя, сохранение профиля и восстановление после reload. Полный опубликованный smoke фиксируется отдельно в [протоколе приёмки](demo.md), а не выводится из статуса READY.

Локальная разработка имеет собственный Supabase; игнорируемый `.env.local` текущей копии восстановлен на loopback. Текущий адрес сдачи — [release](https://learning-squads-1tdad607u-aldik1111.vercel.app), SHA `5ad4ca97ac50678d61104cf0937875b3ccf94cf5`; прежний неизменяемый Preview URL выше сохраняется как историческое доказательство. Первое автоматически созданное окружение Vercel Production без переменных не является адресом сдачи. Настройка отдельного Production не требуется #19; точный критерий — обычные dev/preview не должны автоматически использовать базу сдачи.

Для явных выпусков создана ветка `codex/hackathon-release` на `539e821551664a7c05d8761a6f2a14df71e52697`, затем опубликован release `5ad4ca97ac50678d61104cf0937875b3ccf94cf5`. Координатор подтвердил в Vercel UI успешное сохранение `NEXT_PUBLIC_SUPABASE_URL` и `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` только в Preview scope этой ветки; общих Preview/Development/Production записей нет. 14.11.2026 в 21:14 Asia/Qyzylorda координатор узко проверил [обычный Preview](https://learning-squads-ffbruz94f-aldik1111.vercel.app) того же SHA: три курса доступны, профиль/прогресс честно недоступны без БД. Release сохраняет профиль `QA release settings` после reload (доступность выключена), показывает демо `/plans` и инструкцию жюри. Прежний сдачный URL продолжает открывать профиль без входа Vercel; данные не менялись. HTTP-коды этим UI-прогоном не измерялись. Это не повтор полного Python/многопользовательского сценария или независимой приёмки B. Production автоматически не подключается. Точные результаты и изменения scope фиксируются в [журнале облака](cloud-setup.md).

Настоящая внешняя встреча Meet остаётся неподтверждённой частью #15. Пользователь исключил повтор независимой проверки B из текущей работы; закрытая по его поручению #18 не превращается в подтверждение реального видеозвонка.
