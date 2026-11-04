# Spain Property for Sale

[Подтверждено] Самостоятельный проект подбора недвижимости в Испании на https://spain-estate.online. Оператор — SERGEY VAKORIN; контакты и условия опубликованы в правовых документах.

Статический HTML/CSS/JavaScript, Cloudflare Worker, D1, email-уведомления через Resend.

```sh
npm ci
npm run check
npm test
npm run build
npm run dev
```

[Подтверждено] Вопросы и тексты — showcase/assets/quiz.config.mjs, макет — showcase/index.html, оформление — showcase/assets/travertine-refinement.css, API — cloudflare/worker.mjs, конфигурация — wrangler.jsonc. Неподключённых CRM и социальных ссылок нет.

[Подтверждено] Production main использует https://spain-estate.online. Для локальной и preview-сборки без SITE_URL действует noindex. LEADS_ENABLED включается только после проверки отдельной D1, ключа шифрования и уведомлений.

[Подтверждено] Настройка и статус запуска: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). Секреты и локальные инструкции агентов в Git не публикуются.
