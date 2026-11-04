# Запуск Spain Property for Sale

[Подтверждено] Репозиторий: uladzislaududarau/spain-estate.online, ветка main. Worker: spain-property-for-sale. Static Assets: dist, binding ASSETS. Основной домен: spain-estate.online.

[Подтверждено] Команды Workers Builds: build — npm run build; deploy — npx wrangler deploy; Node 22+. SITE_URL=https://spain-estate.online задаётся только для production, preview без него.

[Подтверждено] DB binding должен указывать на отдельную базу spain-property-leads; миграции находятся в migrations. keep_vars сохраняет переменные панели.

[Подтверждено] Сайт опубликован на https://spain-estate.online, www привязан к тому же Worker. Технический адрес: https://spain-property-for-sale.phewcy-dev.workers.dev. Создана отдельная D1 spain-property-leads, применены обе миграции. LEAD_ENCRYPTION_KEY создан как Secret; отправитель и получатели email настроены. LEADS_ENABLED=true закреплён в Wrangler после проверки сохранения и email-отправки.

[Подтверждено] RESEND_API_KEY добавлен как Secret в новый Worker. Переменные Telegram удалены. 4 ноября 2026 года тестовая заявка сохранена в D1, повтор распознан как дубликат, статус email — sent после первой попытки. Это подтверждает успешный ответ Resend, но не прочтение письма получателем. Секреты не передаются в браузер или GitHub.

[Подтверждено] Домен активирован на бесплатном тарифе Cloudflare. NS: athena.ns.cloudflare.com и viddy.ns.cloudflare.com. Custom Domains для основного домена и www закреплены в routes конфигурации Wrangler.

[Подтверждено] В Cloudflare GitHub App добавлен только новый репозиторий spain-estate.online, прежние разрешения сохранены. Новый Worker подключён к main этого репозитория; push запускает сборку и деплой.

[Подтверждено] Отправитель — Spain Property for Sale <leads@notify.spain-estate.online>. Домен notify.spain-estate.online подтверждён в Resend (Verified). Получатели задаются через LEAD_NOTIFICATION_EMAILS, несколько адресов — через запятую.

[Подтверждено] Для привязки сайта удалены только две парковочные A-записи основного домена и CNAME www. Резервная копия парковочных записей сохранена локально; почтовые записи сохранены.

[Подтверждено] Сначала D1 сохраняет зашифрованную заявку, затем идут уведомления. Сбой уведомлений не отменяет запись. Cron каждые 5 минут выполняет повторы и очистку заявок старше 180 дней. Копии сообщений удаляются оператором отдельно.

[Подтверждено] Базовый Google Ads AW-18527353101 загружается после согласия на маркетинговые cookie. Замена домена не отменяет отдельную проверку назначения в Google Ads.

[Подтверждено] Уведомления оператору отправляются только через Resend на email. Telegram Bot API удалён из кода; токен бота и Chat ID не требуются. Telegram в квизе остаётся вариантом контакта клиента. Старая колонка telegram_status сохранена в схеме D1 для совместимости, но не участвует в отправке или очереди повторов.
