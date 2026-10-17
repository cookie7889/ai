---
name: bitrix24
description: Доступ к Битрикс24 пользователя (imagemark.bitrix24.ru) — задачи, комментарии, чаты, сообщения, пользователи. Используй, когда пользователь спрашивает про свои задачи, дедлайны, проекты, что писали в чате/коллеги, или просит создать задачу/комментарий/сообщение в Битриксе.
---

# Битрикс24 через входящий вебхук

Пользователь: Вячеслав Климов, user ID **424**, портал imagemark.bitrix24.ru.
Пути и секреты — в `~/.config/opencode/skills/.env` (машинно-зависимый файл).
Перед вызовами: `set -a; . ~/.config/opencode/skills/.env; set +a`

Вебхук: `$BITRIX24_DIR/webhook` — НИКОГДА не выводи его содержимое.
Права вебхука: task, tasks, im, imbot, user, sonet_group, disk, ai_admin.

Вызов: `$BITRIX24_DIR/b24 <method> '<json-params>'` (POST JSON, ответ JSON). Парсить через python3.

## Частые методы

Задачи:
- Мои открытые: `tasks.task.list '{"filter":{"RESPONSIBLE_ID":424,"!REAL_STATUS":[5,6,7]},"select":["ID","TITLE","DEADLINE","STATUS","CREATED_BY","GROUP_ID"],"order":{"DEADLINE":"asc"}}'`
  - соисполнитель: `"ACCOMPLICE":424`; наблюдатель: `"AUDITOR":424`; поставленные мной: `"CREATED_BY":424`
  - просроченные: добавить `"<DEADLINE":"<ISO now>"`
  - пагинация: `"start":50` (по 50 штук, `total` в ответе)
- Одна задача: `tasks.task.get '{"taskId":ID}'`
- Комментарии: `task.commentitem.getlist '{"TASKID":ID}'`
- Статусы: 2 ждёт выполнения, 3 выполняется, 4 ждёт контроля, 5 завершена, 6 отложена

Чаты:
- Последние диалоги: `im.recent.list '{}'` (id: число = личка с юзером, `chatNNN` = групповой)
- Сообщения: `im.dialog.messages.get '{"DIALOG_ID":"chat14464","LIMIT":50}'` (старше — `"LAST_ID":<min id>`)
- Поиск чата: `im.search.chat.list '{"FIND":"текст"}'`

Пользователи: `user.get '{"ID":17}'`, поиск `user.search '{"NAME":"Иван"}'`. Имена авторов подставляй вместо ID.
Группы/проекты: `sonet_group.get '{}'`.

## Запись — только по явной просьбе пользователя
Перед отправкой покажи текст и получи подтверждение:
- `tasks.task.add '{"fields":{"TITLE":"...","RESPONSIBLE_ID":424,"DEADLINE":"..."}}'`
- `task.commentitem.add '{"TASKID":ID,"FIELDS":{"POST_MESSAGE":"..."}}'`
- `im.message.add '{"DIALOG_ID":"...","MESSAGE":"..."}'`

Документация методов: https://apidocs.bitrix24.ru/
