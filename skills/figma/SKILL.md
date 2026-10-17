---
name: figma
description: Доступ к Figma пользователя через headless-браузер — посмотреть макет, выгрузить фреймы в PNG 1:1, найти node-id слоя, сравнить вёрстку с макетом (pixel perfect, наложение с инверсией). Используй, когда дают ссылку figma.com/design/... или просят сверить сайт с макетом.
---

# Figma через Playwright (залогиненная сессия)

Аккаунт: klim.vya@yandex.ru. Пути — в `~/.config/opencode/skills/.env`:
`FIGMA_DIR` (creds + browser profile), `CHROMIUM_PATH`, `SKILLS_TMP_DIR`.
Логин/пароль — `$FIGMA_DIR/creds` (email, пароль; chmod 600).
НИКОГДА не выводи содержимое creds. Сессия браузера — `$FIGMA_DIR/profile`.

Скрипты: `~/.config/opencode/skills/figma/scripts/` (playwright-core в node_modules).
Браузер: авто-подбор в `env.mjs` — сначала бандл-chromium из playwright-core
(`~/.cache/ms-playwright/`), иначе `CHROMIUM_PATH` из .env. Запускать из этой папки.
Временные файлы — в `$SKILLS_TMP_DIR/`, не в `/tmp`.

## Команды

- `node login.mjs` — проверить/обновить сессию. Если «FAIL» — смотри `login-fail.png` (2FA/капча → спросить пользователя).
- `node export.mjs '<url файла>' <outDir> <nodeId> [nodeId…]` — PNG 1:1 через панель Export.
  nodeId в формате `8937:10015` или `8937-10015` (из `?node-id=` в ссылке). ~45 с на каждую ноду (на каждую — свежий браузер).
- `node find-node.mjs '<url с node-id>' "<имя слоя>"` — кликает слой в панели Layers (видимой при этой ноде), печатает его node-id.
- `node screenshot.mjs '<url>' out.png [nodeId]` — скриншот редактора (понять, что выделено, какие слои/варианты есть).
- `python3 bounds.py export.png` — координаты фреймов внутри экспорта секции (фон секции однотонный).
- `python3 overlay.py design.png x y w h site.png out.png` — вырезает фрейм из макета и строит:
  `out.png` (сайт + инвертированный макет 50/50, как PerfectPixel), `out-diff.png` (разница), `out-design.png` (кроп макета).

## Как сверять вёрстку

1. Выгрузить секцию/фрейм (`export.mjs`), найти фреймы брейкпоинтов (`bounds.py`). Ширина фрейма подсказывает
   ширину вьюпорта (фрейм 709 при паддинге контейнера 30 → вьюпорт 769 и т.п.).
2. Снять сайт Playwright'ом с той же шириной, скриншот нужного элемента (`locator.screenshot`), `deviceScaleFactor: 1`.
3. `overlay.py` → посмотреть картинку (Read), сдвиги видны двоением. Высоту/отступы сверять числами из `getBoundingClientRect`.

## Грабли

- Доступ к файлам обычно view-only («Ask to edit»): `window.figma` (Plugin API) недоступен, горячие клавиши частично.
  Экспорт через панель Export работает.
- Без desktop userAgent CloudFront отдаёт 403 (задан в `common.mjs`).
- Figma отдаёт экспорт blob-ссылкой и тут же её отзывает → штатный download в Playwright падает
  («Target page… closed»), а на самом скачивании headless-chromium падает с SIGSEGV. `common.mjs` перехватывает
  `URL.createObjectURL`, читает blob напрямую и глушит клик по download-ссылке.
- Второй экспорт подряд в той же вкладке нестабилен — `export.mjs` перезапускает браузер на каждую ноду.
- Секции с бейджами брейкпоинтов экспортируются без подписей; кроп по `bounds.py` включает тени —
  саму карточку ищи по яркости фона.
