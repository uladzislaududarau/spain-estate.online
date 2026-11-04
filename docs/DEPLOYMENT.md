# Запуск Spain Property for Sale

[Подтверждено] Репозиторий: uladzislaududarau/spain-estate.online, ветка main. Worker: spain-property-for-sale. Static Assets: dist, binding ASSETS. Основной домен: spain-estate.online.

[Подтверждено] Команды Workers Builds: build — npm run build; deploy — npx wrangler deploy; Node 22+. SITE_URL=https://spain-estate.online задаётся только для production, preview без него.

[Подтверждено] DB binding должен указывать на отдельную базу spain-property-leads; миграции находятся в migrations. keep_vars сохраняет переменные панели.

[Требует уточнения] До приёма заявок добавить в Settings → Variables and Secrets: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, RESEND_API_KEY, LEAD_ENCRYPTION_KEY как Secrets. LEAD_EMAIL_FROM и LEAD_NOTIFICATION_EMAILS — настройки отправителя и получателей. Секреты не передаются в браузер или GitHub.

[Подтверждено] Новый отправитель планируется Spain Property for Sale <leads@notify.spain-estate.online>. Перед отправкой необходимо подтвердить домен notify.spain-estate.online в Resend. Получатели задаются через LEAD_NOTIFICATION_EMAILS, несколько адресов — через запятую.

[Подтверждено] Сначала D1 сохраняет зашифрованную заявку, затем идут уведомления. Сбой уведомлений не отменяет запись. Cron каждые 5 минут выполняет повторы и очистку заявок старше 180 дней. Копии сообщений удаляются оператором отдельно.

[Подтверждено] Базовый Google Ads AW-18527353101 загружается после согласия на маркетинговые cookie. Замена домена не отменяет отдельную проверку назначения в Google Ads.
