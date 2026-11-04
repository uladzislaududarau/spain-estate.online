# Запуск Spain Property for Sale

[Подтверждено] Репозиторий: uladzislaududarau/spain-estate.online, ветка main. Worker: spain-property-for-sale. Static Assets: dist, binding ASSETS. Основной домен: spain-estate.online.

[Подтверждено] Команды Workers Builds: build — npm run build; deploy — npx wrangler deploy; Node 22+. SITE_URL=https://spain-estate.online задаётся только для production, preview без него.

[Подтверждено] DB binding должен указывать на отдельную базу spain-property-leads; миграции находятся в migrations. keep_vars сохраняет переменные панели.

[Подтверждено] Первый деплой доступен на https://spain-property-for-sale.phewcy-dev.workers.dev. Создана отдельная D1 spain-property-leads, применены обе миграции. LEAD_ENCRYPTION_KEY создан как Secret; отправитель и получатели email настроены. LEADS_ENABLED=false.

[Требует уточнения] До приёма заявок добавить в Settings → Variables and Secrets: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID и RESEND_API_KEY как Secrets. Затем проверить сохранение и доставку тестовой заявки. Секреты не передаются в браузер или GitHub.

[Требует уточнения] Домен добавлен на бесплатный тариф Cloudflare, ожидает смены NS у регистратора на athena.ns.cloudflare.com и viddy.ns.cloudflare.com. После активации подключить основной домен и www к Worker и закрепить Custom Domains в routes конфигурации Wrangler.

[Требует уточнения] Автоматические сборки пока не подключены: существующая установка Cloudflare GitHub App не предоставляет доступ к новому репозиторию. Нужно добавить только spain-estate.online в выбранные репозитории и завершить Connect в разделе Builds нового Worker.

[Подтверждено] Новый отправитель планируется Spain Property for Sale <leads@notify.spain-estate.online>. Перед отправкой необходимо подтвердить домен notify.spain-estate.online в Resend. Получатели задаются через LEAD_NOTIFICATION_EMAILS, несколько адресов — через запятую.

[Подтверждено] Сначала D1 сохраняет зашифрованную заявку, затем идут уведомления. Сбой уведомлений не отменяет запись. Cron каждые 5 минут выполняет повторы и очистку заявок старше 180 дней. Копии сообщений удаляются оператором отдельно.

[Подтверждено] Базовый Google Ads AW-18527353101 загружается после согласия на маркетинговые cookie. Замена домена не отменяет отдельную проверку назначения в Google Ads.
