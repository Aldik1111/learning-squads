# Облачное окружение Learning Squads

Дата: 14.11.2026. Отдельный Supabase Free в Aldik1111's Org, проект `learning-squads`, ref `xoczdfnefjufvyhpvuho`. Пользователь создал проект самостоятельно; Anonymous Sign-Ins включены. Пароль базы и административные ключи приложению не передавались.

Миграции `202611140001`–`202611140007` применены по порядку через SQL Editor. Последний пакет 006–007 завершился `Success. No rows returned`. Это ручное применение SQL, **не зарегистрированная история Supabase CLI**. Перед первым `db push` сверить функции/таблицы и оформить `migration repair` для уже применённых версий с административным доступом владельца. Не запускать повторно миграции и не делать reset облачной БД.

После 007 скрипт `scripts/test_supabase.mjs` прошёл на облаке: пять разных anonymous-профилей, восстановление сессии, закрытые ключи тестов, сохранение/повтор попыток, конкурентное заполнение команды до четырёх, дедупликация приглашений, отказ постороннему, неизменяемая отметка перехода и завершение интервала практики. Тестовые данные помечены `QA mwgip0lq`; готовность тестовых профилей выключена в finally. Meet URL в этом тесте — форматный пример, реального созвона не было.

Приложению нужны только `NEXT_PUBLIC_SUPABASE_URL` и `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Значения хранятся вне Git. После смены публичных переменных требуется пересборка Next.js. Локальные и облачные гостевые сессии разделены ключом хранилища по URL проекта.

Публичная выкладка и браузерная приёмка фиксируются отдельно в [demo.md](demo.md). Этот протокол подтверждает облачный API, но не опубликованный сайт или участие в Meet.

## Vercel

Создан отдельный Hobby-проект [learning-squads](https://vercel.com/aldik1111/learning-squads), ID `prj_SYsJbg6uoa49tzhhGJiRleDlbWV5`. GitHub App подключён с разрешения владельца только к `Aldik1111/learning-squads`; main и его защита не изменялись. Framework: Next.js, Node.js24, стандартные команды сборки, Basic build machine. Две публичные переменные Supabase сохранены для Preview. Preview запускается из `codex/a-learning-modules`.

Проверяемая Preview-версия: [learning-squads-luuljvgfs-aldik1111.vercel.app](https://learning-squads-luuljvgfs-aldik1111.vercel.app), deployment `A8f9GNDdN3TcnKB4QXc9XRnZdicj`, SHA `d922e3ce6cf1dd19bb680c646e19432ed30ce29e`, статус Ready. Владелец отдельно разрешил публичный доступ; Vercel Authentication выключен только для этого проекта, Protected Sourcemaps оставлен включённым. Supabase-проверки прав сохраняются.

Особенность первой выкладки: ручная команда в UI называлась Create Preview Deployment, но Vercel назначил первой сборке `CMPL5h3S6PkgNNEUaT3zVzwqs5yd` окружение Production. В ней нет переменных Supabase; её адреса `project-2k6he.vercel.app` и `learning-squads-p428jmbgv-aldik1111.vercel.app` не использовать для приёмки. Следующая автоматическая сборка рабочей ветки получила правильное окружение Preview. Production-ветка в настройках — main; полноценная Production-конфигурация остаётся отдельной работой.
