# Запуск Spain Property for Sale

[Подтверждено] Репозиторий: uladzislaududarau/spain-estate.online, ветка main. Worker: spain-property-for-sale. Static Assets: dist, binding ASSETS. Основной домен: spain-estate.online.

[Подтверждено] Команды Workers Builds: build — npm run build; deploy — npx wrangler deploy; Node 22+. SITE_URL=https://spain-estate.online задаётся только для production, preview без него.

[Подтверждено] DB binding должен указывать на отдельную базу spain-property-leads; миграции находятся в migrations. keep_vars сохраняет переменные панели.

[Подтверждено] Первый деплой доступен на https://spain-property-for-sale.phewcy-dev.workers.dev. Создана отдельная D1 spain-property-leads, применены обе миграции. LEAD_ENCRYPTION_KEY создан как Secret; отправитель и получатели email настроены. LEADS_ENABLED=false.

[Требует уточнения] До приёма заявок добавить в Settings → Variables and Secrets: RESEND_API_KEY как Secret. Затем проверить сохранение и доставку тестовой заявки. Секреты не передаются в браузер или GitHub.

[Подтверждено] Домен активирован на бесплатном тарифе Cloudflare. NS: athena.ns.cloudflare.com и viddy.ns.cloudflare.com. Custom Domains для основного домена и www закреплены в routes конфигурации Wrangler.

[Подтверждено] В Cloudflare GitHub App добавлен только новый репозиторий spain-estate.online, прежние разрешения сохранены. Новый Worker подключён к main этого репозитория; push запускает сборку и деплой.

[Подтверждено] Новый отправитель планируется Spain Property for Sale <leads@notify.spain-estate.online>. Перед отправкой необходимо подтвердить домен notify.spain-estate.online в Resend. Получатели задаются через LEAD_NOTIFICATION_EMAILS, несколько адресов — через запятую.

[Подтверждено] Сначала D1 сохраняет зашифрованную заявку, затем идут уведомления. Сбой уведомлений не отменяет запись. Cron каждые 5 минут выполняет повторы и очистку заявок старше 180 дней. Копии сообщений удаляются оператором отдельно.

[Подтверждено] Базовый Google Ads AW-18527353101 загружается после согласия на маркетинговые cookie. Замена домена не отменяет отдельную проверку назначения в Google Ads.

[Подтверждено] Уведомления оператору отправляются только через Resend на email. Telegram Bot API удалён из кода; токен бота и Chat ID не требуются. Telegram в квизе остаётся вариантом контакта клиента. Старая колонка telegram_status сохранена в схеме D1 для совместимости, но не участвует в отправке или очереди повторов.
