export const policyVersion = '2026-11-05';
export const steps = [
  {
    "id": "regions",
    "multiple": true,
    "exclusive": "undecided",
    "title": {
      "ru": "Какой регион Испании вы рассматриваете?",
      "en": "Which region of Spain are you considering?"
    },
    "options": [
      [
        "costa-blanca",
        "Коста-Бланка",
        "Costa Blanca"
      ],
      [
        "costa-del-sol",
        "Коста-дель-Соль / Марбелья",
        "Costa del Sol / Marbella"
      ],
      [
        "barcelona",
        "Барселона и окрестности",
        "Barcelona and surroundings"
      ],
      [
        "costa-brava",
        "Коста-Брава",
        "Costa Brava"
      ],
      [
        "mallorca",
        "Майорка",
        "Mallorca"
      ],
      [
        "undecided",
        "Пока не определился",
        "Not sure yet"
      ]
    ]
  },
  {
    "id": "purpose",
    "title": {
      "ru": "Для чего вы выбираете недвижимость?",
      "en": "What is your main reason for buying?"
    },
    "options": [
      [
        "residence-permit",
        "Для получения ВНЖ",
        "Residence permit"
      ],
      [
        "permanent-home",
        "Для постоянного проживания",
        "Permanent home"
      ],
      [
        "investment",
        "Для инвестиций",
        "Investment"
      ],
      [
        "rental",
        "Для сдачи в аренду",
        "Rental income"
      ]
    ]
  },
  {
    "id": "propertyType",
    "title": {
      "ru": "Какой тип объекта вас интересует?",
      "en": "What type of property interests you?"
    },
    "options": [
      [
        "apartment",
        "Квартира / апартаменты",
        "Apartment"
      ],
      [
        "villa",
        "Вилла / дом",
        "Villa / house"
      ],
      [
        "penthouse",
        "Пентхаус",
        "Penthouse"
      ],
      [
        "townhouse",
        "Таунхаус",
        "Townhouse"
      ],
      [
        "commercial",
        "Коммерческая недвижимость",
        "Commercial property"
      ]
    ]
  },
  {
    "id": "budgets",
    "multiple": true,
    "title": {
      "ru": "Какой бюджет вы рассматриваете?",
      "en": "What budget are you considering?"
    },
    "options": [
      [
        "under-100k",
        "До 100 000 €",
        "Under €100,000"
      ],
      [
        "100k-200k",
        "100 000–200 000 €",
        "€100,000–200,000"
      ],
      [
        "200k-300k",
        "200 000–300 000 €",
        "€200,000–300,000"
      ],
      [
        "300k-500k",
        "300 000–500 000 €",
        "€300,000–500,000"
      ],
      [
        "500k-1m",
        "500 000–1 000 000 €",
        "€500,000–1,000,000"
      ],
      [
        "1m-plus",
        "1 000 000 € и выше",
        "€1,000,000 and above"
      ]
    ]
  },
  {
    "id": "timeline",
    "title": {
      "ru": "Когда планируете приобретать?",
      "en": "When are you planning to buy?"
    },
    "options": [
      [
        "soon",
        "В ближайшее время",
        "As soon as possible"
      ],
      [
        "3-6-months",
        "Через 3–6 месяцев",
        "In 3–6 months"
      ],
      [
        "6-plus-months",
        "Более чем через 6 месяцев",
        "In more than 6 months"
      ]
    ]
  }
];
export const copy = {
  "ru": {
    "close": "Закрыть",
    "back": "Назад",
    "next": "Продолжить",
    "send": "Получить",
    "sending": "Сохраняем заявку…",
    "step": "Шаг",
    "of": "из",
    "single": "Выберите один вариант — перейдём к следующему вопросу.",
    "multiple": "Можно выбрать один или несколько вариантов.",
    "contactTitle": "Подбор объектов по вашим критериям готов",
    "contactIntro": "Укажите удобный способ получения.",
    "name": "Ваше имя",
    "namePlaceholder": "Введите ваше имя",
    "invalidName": "Укажите ваше имя буквами, до 80 символов.",
    "messenger": "Удобный способ связи",
    "phone": "Ваш номер WhatsApp",
    "telegram": "Телефон Telegram или username",
    "telegramHint": "Например @username или номер телефона с кодом страны.",
    "phoneHint": "Выберите страну и введите ваш номер телефона без кода страны.",
    "consentBefore": "Я соглашаюсь с ",
    "consentLink": "условиями обработки персональных данных",
    "consentAfter": " для обработки моего запроса оператором сайта SERGEY VAKORIN.",
    "country": "Страна и телефонный код",
    "nationalPlaceholder": "Номер телефона",
    "countryDetected": "Страну можно изменить.",
    "countryFallback": "",
    "countryLoadError": "Введите номер целиком с кодом страны, начиная с +.",
    "invalidCountryPhone": "Проверьте номер и выбранную страну: количество цифр не соответствует формату.",
    "invalidPhone": "Проверьте номер телефона и выбранную страну.",
    "invalidTelegram": "Введите Telegram username (от 5 символов) или номер с кодом страны.",
    "consentError": "Подтвердите согласие на обработку персональных данных.",
    "networkError": "Не удалось сохранить заявку. Проверьте соединение и попробуйте ещё раз. Ваши ответы сохранены.",
    "rateError": "Слишком много попыток. Попробуйте отправить заявку немного позже.",
    "successTitle": "Благодарим за ваш запрос.",
    "successText": "В ближайшее время мы вышлем вам подборку объектов недвижимости в Испании по вашим критериям выбранным вами способом получения."
  },
  "en": {
    "close": "Close",
    "back": "Back",
    "next": "Continue",
    "send": "Receive",
    "sending": "Saving your request…",
    "step": "Step",
    "of": "of",
    "single": "Choose one option to continue.",
    "multiple": "You can select one or more options.",
    "contactTitle": "Your property selection is ready",
    "contactIntro": "Choose your preferred delivery method.",
    "name": "Your name",
    "namePlaceholder": "Enter your name",
    "invalidName": "Enter your name using letters, up to 80 characters.",
    "messenger": "Preferred contact method",
    "phone": "Your WhatsApp number",
    "telegram": "Telegram phone number or username",
    "telegramHint": "For example @username or a phone number with country code.",
    "phoneHint": "Choose your country and enter your phone number without the country code.",
    "consentBefore": "I agree to the ",
    "consentLink": "personal data processing terms",
    "consentAfter": " for my enquiry to be processed by website operator SERGEY VAKORIN.",
    "country": "Country and calling code",
    "nationalPlaceholder": "Phone number",
    "countryDetected": "You can change the country.",
    "countryFallback": "",
    "countryLoadError": "Enter the full international number starting with +.",
    "invalidCountryPhone": "Check your number and country: the number length does not match the format.",
    "invalidPhone": "Check your phone number and selected country.",
    "invalidTelegram": "Enter a Telegram username (at least 5 characters) or an international phone number.",
    "consentError": "Please agree to the personal data processing terms.",
    "networkError": "We could not save your request. Check your connection and try again. Your answers are saved.",
    "rateError": "Too many attempts. Please try again a little later.",
    "successTitle": "Thank you for your request.",
    "successText": "We will send your selection shortly using your chosen method."
  }
};
