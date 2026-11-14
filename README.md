# Learning Squads

MVP хакатона: учебные материалы Python, How to use AI и Spanish, проверка знаний, команды и разговорная практика. B2C веб для работающих взрослых.

**Сайт для проверки:** [Learning Squads Preview](https://learning-squads-luuljvgfs-aldik1111.vercel.app). Вход в Vercel не требуется; приложение создаёт гостевой профиль браузера. Опубликованный SHA `d922e3ce6cf1dd19bb680c646e19432ed30ce29e`. Это проверяемая версия рабочей ветки, не merge в main и не подтверждение реального созвона Meet.

Состояние 14.11.2026: код Next.js/React, API, SQL-миграции, гостевой Supabase-клиент и Python runner находятся в рабочей ветке. Облачный проект, публичный URL и сквозная приёмка фиксируются отдельно в docs/demo.md; наличие кода и зелёные локальные проверки не означают выкладку.

## Запуск

Нужен Node.js24 и npm. Используйте отдельный проект Supabase для Learning Squads.

```sh
npm ci
```

Скопируйте `.env.example` в `.env.local`, заполните URL проекта и publishable key (или legacy anon key). Никогда не ставьте service_role/secret в NEXT_PUBLIC-переменные. В Supabase включите Anonymous Sign-Ins и примените все `supabase/migrations/*.sql` по порядку через CLI или SQL Editor. Приложению не нужен административный ключ. Не используйте проект, БД или секреты Smart Meal.

```sh
npm run dev
```

Откройте `http://127.0.0.1:3000`. Каталог/уроки доступны даже без настроенного Supabase; профиль, отправка результатов и совместные функции покажут честную ошибку до подключения. Это не деморежим и не имитация сохранения.

## Локальный Supabase

При работающем Docker:

```sh
npx supabase@3.1.0 start
```

Конфигурация находится в `supabase/config.toml`; anonymous sign-in включён. Возьмите локальные API URL и publishable/anon key для `.env.local`. `supabase status` может выводить служебные секреты: не копируйте весь вывод в чат/логи репозитория. Нужны только публичный URL/key. Остановить только этот локальный проект: `npx supabase@3.1.0 stop` из этой папки. Не делайте reset общей или облачной БД.

## Проверки

```sh
npm run typecheck
npm run lint
npm test
npm run test:db
python content/validate.py
python scripts/check_repository.py
npm run build
npm start
```

`test:db` требует Docker, создаёт и удаляет собственный временный PostgreSQL-контейнер без сети; не трогает другие контейнеры/тома. Проверяет настоящие SQL-функции и гонку за последнее место, но использует auth-fixture: это не проверка GoTrue, браузерной авторизации или облака. Browser/runner и сквозные результаты — в docs/demo.md и tests/e2e. CI Application checks запускается на push main/codex-веток и перед слиянием; Repository hygiene проверяет только структуру.

## Выкладка

Текущее облако и журнал ручного применения миграций: [docs/cloud-setup.md](docs/cloud-setup.md). Перед первым CLI `db push` прочитайте ограничения истории миграций в этом журнале.

В Vercel импортируйте этот GitHub-репозиторий как Next.js, задайте две NEXT_PUBLIC_SUPABASE_* переменные для Preview/Production, включите anonymous sign-in в выделенном Supabase и примените миграции. Не коммитьте окружение. После смены NEXT_PUBLIC-переменных нужна новая сборка. Проверяйте публичный URL, два независимых гостевых профиля, RLS, результаты после обновления и настоящую Meet-ссылку; merge/зелёная сборка не доказывают эту приёмку.

## Команда и процесс

- A — [@Aldik1111](https://github.com/Aldik1111), B — [@bigstep832](https://github.com/bigstep832). Области: docs/ownership.md; текущая делегация — в Issues.
- Разработка, небольшие коммиты и push идут в своей codex-ветке без ранних PR. PR открываем только перед слиянием готовой части; нужны независимое ревью и проверки, защита main сохраняется.
- Не закрывайте задачу без фактической проверки критериев. Состояние до PR записывайте в существующей Issue с SHA.

## Навигация по документам

[Правила](AGENTS.md) · [MVP](docs/mvp.md) · [План](docs/plan.md) · [Контракты API](docs/contracts.md) · [Решения](docs/decisions.md) · [Приёмка](docs/demo.md) · [Совместная работа](CONTRIBUTING.md).

Нет обязательной регистрации, платежей, квоты созвонов или календаря бронирований. Время от перехода в Meet не доказывает фактическое присутствие; языки профиля — самооценка. Python — учебная самопроверка. Монетизация остаётся гипотезой.
