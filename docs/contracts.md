# Контракты — стартовое соглашение
Статус: проект интерфейса. API и TypeScript-схем ещё нет. B выполняет T02, согласует с A аргументы, ответы, ошибки, затем фиксирует в src/contracts и src/lib/api-client.

## Методы
ensureGuestSession; getProfile/updateProfile; getCourses/getModule; submitQuiz/getProgress;
findSquads/createSquad/joinSquad/leaveSquad; setCallAvailability;
requestLanguagePartner; createSquadCall; acceptInvitation/declineInvitation/cancelInvitation;
setMeetLink; recordMeetTransition; getNotifications/markRead.

## Обязательное согласование T02
- Поля DTO, идентификаторы и даты UTC; часовой пояс профиля.
- Схемы запросов/ответов, коды ошибок, страницы списков.
- Проверка сессии на сервере; userId из тела не является авторизацией.
- Идентификатор повторяемой команды для попыток, приглашений и переходов.
- Состояния приглашения: pending → accepted/declined/cancelled/expired.
- Встреча отдельно от приглашений; ответы групповых участников независимы.
- Версия контента/задания у сохранённой попытки.
- Отметки перехода не подтверждают длительность присутствия.
- Публичный интерфейс PythonExercise и формат результата самопроверки.
- Формат Markdown/метаданных для A. Контент не импортировать в клиент вместе с секретными данными.
- Ошибки: SESSION_REQUIRED, FORBIDDEN, INVALID_INPUT, SQUAD_FULL (если лимит утверждён), NO_AVAILABLE_PARTNER, INVITATION_EXPIRED, INVITATION_CANCELLED, MEET_LINK_MISSING.
- Нереализованная функция возвращает честную ошибку, а не фиктивный успех.

A может использовать согласованные fixtures в dev; сдаваемая версия работает с настоящим API.
