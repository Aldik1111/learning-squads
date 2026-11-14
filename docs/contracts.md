# Контракты Learning Squads v1

Статус 14.11.2026: TypeScript-модели и реальный API реализованы в рабочей ветке. Это не доказательство настройки облачного Supabase или приёмки опубликованного сайта.

Источник типов: `src/contracts/index.ts`. Клиент: `src/lib/api-client/index.ts`, именованные exports и объект `api`. HTTP-обработчик: `src/app/api/[...path]/route.ts`. Публичные материалы: `src/features/learning/server/content.ts`.

## Сессия и ошибки

`ensureGuestSession(): Promise<{userId:string}>` восстанавливает Supabase-сессию браузера или создаёт anonymous user. Локальное хранилище разделено по Supabase origin: `learning-squads-auth:<origin>`. Прежняя общая запись переносится только при совпадении JWT issuer с текущим проектом; сессия другого проекта не переиспользуется. Сервер всё равно проверяет токен — issuer здесь лишь подсказка переноса хранилища. Одновременное создание координируется promise и Web Locks. Никаких email/паролей в пользовательском потоке. Совместное использование одного профиля браузера даёт общие данные; разные профили независимы.

Защищённые вызовы отправляют bearer JWT. Сервер проверяет его `auth.getUser(token)` и вызывает PostgreSQL RPC от имени пользователя; `auth.uid()` определяет владельца данных. `userId` в JSON не используется для авторизации. Service-role ключ приложению не нужен. Таблицы закрыты RLS и отсутствием прямых grants; только узкие RPC имеют execute для authenticated. Внутренние функции и ключи оценивания закрыты.

Ответ: `{data:T}` или `{error:{code,message}}`. Клиент бросает `ApiError` с кодом и понятным сообщением. Коды перечислены в `AppErrorCode`, включая SESSION_REQUIRED/FORBIDDEN/INVALID_INPUT/NOT_FOUND/CONFLICT/SQUAD_FULL/NO_AVAILABLE_PARTNER/INVITATION_PENDING/INVITATION_EXPIRED/INVITATION_CANCELLED/MEET_LINK_MISSING/SERVICE_UNAVAILABLE. Нет фиктивного успеха при отсутствующем окружении. Сбой сети/5xx/429 при проверке identity provider возвращает SERVICE_UNAVAILABLE503, а не SESSION_REQUIRED401; временный отказ не означает потерю гостевого профиля. Таймаут HTTP — технические 20 секунд, не лимит учебной попытки.

## Методы

- `getCourses()`, `getModule(moduleId)` доступны без сессии. Возвращают материалы/стартовый Python, без answerKey/referenceFile/решений.
- `getProfile()`, `updateProfile(ProfileInput)`: имя, track, level, primaryLanguage, knownLanguages, timezone, availableForCalls. Неподтверждённое владение языком остаётся самооценкой.
- `submitQuiz(moduleId, contentVersion, answers, requestId)` возвращает сохранённый `QuizAttempt`: id, moduleId, contentVersion, answers, items с correctOptionId/correct/explanation, submittedAt. Оценивание в PostgreSQL по неизменяемому снимку ключей. Нет порога прохождения или числа попыток.
- `submitPythonResult(PythonRunResult, requestId)` хранит честно помеченную `self-check`: exerciseId/version, status, passed/total. Прерванные/error/timeout/cancelled результаты не объявляются успешными. Код пользователя и stdout не сохраняются. Это недоверенная самопроверка, не серверная квалификация.
- `getProgress()` → quizAttempts/pythonAttempts по submittedAt DESC и practice `{moduleId,seconds,minimumPracticeMinutes}`. Другие пользователи этих данных не видят.
- `findSquads({track?,level?})`, `createSquad({name,track,level},requestId)`, `joinSquad(id)`, `leaveSquad(id)`. Squad включает count, isMember и состав members только для участника. Мест максимум4; join атомарен и повторяем. Несколько команд разрешены.
- `setCallAvailability(boolean)`, `heartbeat()`: готовность и актуальность2мин; UI отправляет heartbeat, когда видимая страница активна.
- `requestLanguagePartner(language,requestId,moduleId?)`: случайный другой профиль с указанным основным языком и актуальной включённой доступностью.
- `createSquadCall(squadId,requestId,moduleId?,recipientIds?)`: выбранные текущие сокомандники; отсутствие recipientIds означает всех остальных. Пустой выбор, дубли, self и посторонние отклоняются.
- `getMyCalls()`, `getCall(id)`: организатор и принявшие участники. Call.participants включает invitationId (null у организатора), status и transitionedAt.
- `getNotifications()`, `markRead(id)`, `acceptInvitation(id)`, `declineInvitation(id)`, `cancelInvitation(id)`. Один invitation на получателя/call; групповые ответы независимы. pending → accepted/declined/cancelled/expired. Срок10мин; отмена только отправителем, ответ только получателем. Повтор того же принятого действия не создаёт дубль. Техническая защита от спама: у пары отправитель→получатель допускается одно ожидающее приглашение независимо от нового requestId и другой встречи. Создание сериализуется по отправителю; повтор до ответа/отмены/истечения получает INVITATION_PENDING. Это не квота созвонов: после конечного ответа можно создать новую встречу. Истечение проверяется по clock_timestamp после получения блокировки строки, чтобы запрос, ожидавший блокировку, не принимал просроченное приглашение.
- `setMeetLink(callId,meetUrl)` — только организатор; `https://meet.google.com/abc-defg-hij`, реальную комнату создаёт организатор отдельно. Произвольные внешние URL отвергаются.
- `recordMeetTransition(callId)` — разрешённому участнику, с готовой ссылкой. Серверное время фиксируется один раз; повтор не сбрасывает.
- `finishPractice(callId)` — явное завершение измерения для модуля после перехода. Серверное endedAt фиксируется один раз. Итог — объединение пересекающихся завершённых интервалов пользователя по модулю; один и тот же промежуток не суммируется дважды. Незавершённый таймер не входит в накопленный итог. Это время от перехода, не доказательство присутствия; завершение курса автоматически не выставляется.

## Повторы и версии

`requestId` — UUID одной логической команды. UI создаёт его при начале попытки/создания команды/приглашения и сохраняет при транспортном retry. Новый пользовательский запуск создаёт новый UUID. Повтор с тем же payload возвращает исходный результат, изменённый payload — CONFLICT. Нельзя автоматически назначать новый ID при неизвестном исходе запроса.

Снимки contentVersion/exerciseVersion не меняют прошлые попытки. Первые материалы согласованы с форматом `content/README.md`; ключи опубликованного quiz хранятся в versioned SQL seed. Изменения после применения — только новой миграцией/версией; генератор первой миграции отказывается перезаписывать существующую.

Локальные модели KnowledgeCheck адаптируются из QuizAttempt; initialAttempt восстанавливает результат. PythonExercise получает `PythonExerciseData`, onResult — `PythonRunResult`; изоляцию и ограничения runner описывает собственный README. Production-клиент не импортирует fixtures.

## Проверки и пределы

`npm test` проверяет публичные payload/входы; `npm run test:db` создаёт отдельную временную PostgreSQL без сети и проверяет миграции, SQL-оценивание, права, идемпотентность, выбор получателей, конкурентный последний слот, объединение интервалов. Auth-fixture имитирует auth.uid(), а не GoTrue: анонимный вход, PostgREST, сохранение в независимых браузерах и выкладку обязательно проверять отдельно.
