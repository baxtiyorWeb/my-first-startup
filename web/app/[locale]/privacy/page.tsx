"use client";

import React from "react";
import { useI18n } from "@/lib/i18n/context";
import { LegalDocument, type LegalSection } from "@/components/legal/legal-document";

const CONTACT_EMAIL = "support@thegogetters.uz";

export default function PrivacyPage() {
  const { locale, localePath } = useI18n();

  const content: Record<
    string,
    {
      title: string;
      subtitle: string;
      updated: string;
      intro: string;
      sections: LegalSection[];
      contactLabel: string;
      back: string;
      related: { label: string; href: string }[];
    }
  > = {
    uz: {
      title: "Maxfiylik Siyosati",
      subtitle: "Geters mobil ilovasi va geters.uz veb-sayti uchun",
      updated: "Oxirgi yangilanish: 2026-yil 1-noyabr",
      intro:
        "Ushbu Maxfiylik siyosati «Geters» (keyingi o‘rinlarda — «Platforma», «biz») tomonidan Android ilova, iOS ilova va geters.uz veb-sayti orqali qanday shaxsiy ma’lumotlarni to‘plashi, qanday ishlatishi, kim bilan bo‘lishishi va siz qanday huquqlarga ega ekaningizni tushuntiradi. Platformadan foydalanish orqali siz ushbu siyosatga rozilik bildirasiz.",
      sections: [
        {
          title: "1. Qanday ma’lumotlarni to‘playmiz",
          bullets: [
            "Hisob ma’lumotlari: ism, foydalanuvchi nomi (@handle), email manzil yoki telefon raqam, parol xeshi, Google hisobi orqali kirishda Google ID va tasdiqlangan email.",
            "Profil ma’lumotlari: lavozim/soha, bio, joylashuv, havolalar (GitHub, LinkedIn, X, veb-sayt), avatar va muqova rasmi.",
            "Siz yaratgan kontent: postlar, maqolalar, izohlar, layklar, saqlangan postlar, shaxsiy xabarlar, shikoyatlar va ularning vaqti.",
            "Qurilma va texnik ma’lumotlar: IP manzil, qurilma modeli va turi, operatsion tizim versiyasi, ilova versiyasi, til, vaqt mintaqasi, nosozlik (crash) jurnallari.",
            "Push-bildirishnoma tokeni (siz ruxsat bergan taqdirda) va bildirishnoma sozlamalari.",
            "To‘lov ma’lumotlari: Google Play orqali obuna bo‘lganingizda faqat obuna holati, mahsulot ID si va tranzaksiya identifikatori. Biz bank karta raqamini ko‘rmaymiz va saqlamaymiz — to‘lovni Google Play amalga oshiradi.",
          ],
        },
        {
          title: "2. Ma’lumotlardan qanday foydalanamiz",
          bullets: [
            "Hisob yaratish, autentifikatsiya (Google Sign-In, sessiya tokenlari) va xavfsizlikni ta’minlash.",
            "Kontentni ko‘rsatish, feed, tavsiyalar, qidiruv va bildirishnomalarni shaxsiylashtirish.",
            "Hamjamiyat qoidalarini qo‘llash: shikoyatlarni ko‘rib chiqish, spam, firibgarlik va noqonuniy kontentni aniqlash.",
            "Obunalarni boshqarish va to‘lov holatini tekshirish.",
            "Xizmat sifatini yaxshilash: nosozliklarni tuzatish, unumdorlikni o‘lchash va yangi funksiyalarni sinash.",
            "Qonuniy majburiyatlarni bajarish va vakolatli organlarning qonuniy so‘rovlariga javob berish.",
          ],
        },
        {
          title: "3. Qayta ishlashning huquqiy asoslari",
          paragraphs: [
            "Shaxsiy ma’lumotlarni (a) siz bilan tuzilgan shartnomani bajarish uchun, (b) sizning roziligingiz asosida (masalan, push-bildirishnomalar), (c) qonuniy manfaatlarimiz doirasida (xavfsizlik, spamga qarshi kurash, xizmatni yaxshilash) va (d) qonuniy majburiyatlarni bajarish uchun qayta ishlaymiz.",
          ],
        },
        {
          title: "4. Ma’lumotlarni kim bilan bo‘lishamiz",
          paragraphs: [
            "Biz sizning shaxsiy ma’lumotlaringizni sotmaymiz. Ma’lumotlar faqat xizmatni ko‘rsatish uchun zarur bo‘lgan quyidagi tomonlarga uzatiladi:",
          ],
          bullets: [
            "Google (Google Sign-In va Google Play Billing) — autentifikatsiya va obuna to‘lovlari uchun.",
            "RevenueCat — obuna holatini boshqarish uchun (faqat anonim ilova foydalanuvchi ID si va tranzaksiya ma’lumotlari).",
            "Push-bildirishnoma xizmati (OneSignal yoki shunga o‘xshash provayder) — faqat qurilma tokeni va bildirishnoma matni.",
            "Bulutli hosting, ma’lumotlar bazasi va media saqlash provayderlari — ma’lumotlarni bizning ko‘rsatmalarimiz asosida saqlaydi.",
            "Huquqni muhofaza qiluvchi organlar — faqat qonuniy va asoslangan so‘rov bo‘lganda.",
          ],
        },
        {
          title: "5. Saqlash muddati",
          bullets: [
            "Hisob faol bo‘lgan davrda ma’lumotlar saqlanadi.",
            "Hisobni o‘chirganingizdan so‘ng shaxsiy ma’lumotlar va siz yaratgan kontent 30 kun ichida tizimdan o‘chiriladi.",
            "Zaxira nusxalardan (backup) ma’lumotlar 30 kungacha qolishi mumkin, so‘ng avtomatik o‘chiriladi.",
            "Qonun bo‘yicha saqlanishi shart bo‘lgan yozuvlar (masalan, to‘lov va moderatorlik qarorlari) qonunda belgilangan muddatgacha saqlanadi.",
            "Anonimlashtirilgan va umumlashtirilgan statistika shaxsni aniqlash imkonini bermaydi va cheklovsiz saqlanishi mumkin.",
          ],
        },
        {
          title: "6. Hisobni va ma’lumotlarni o‘chirish",
          paragraphs: [
            "Ilova ichida: Profil → Sozlamalar → «Hisobni o‘chirish» bo‘limi orqali hisobni butunlay o‘chirishingiz mumkin.",
            "Ilovadan tashqarida: geters.uz/uz/account/delete sahifasida email, telefon raqam yoki @handle ni kiritib o‘chirish so‘rovini yuborishingiz mumkin. So‘rov moderatsiya jamoasi tomonidan ko‘rib chiqiladi va 30 kun ichida bajariladi.",
            "O‘chiriladigan ma’lumotlar: hisob yozuvi, profil, postlar, izohlar, layklar, saqlanganlar, obunalar, shaxsiy xabarlar va qurilma tokenlari. Muayyan holatlarda faqat anonimlashtirilgan statistik ma’lumot qoladi.",
          ],
        },
        {
          title: "7. Sizning huquqlaringiz",
          bullets: [
            "Ma’lumotlaringiz nusxasini olish (Sozlamalar → «Ma’lumotlarni eksport qilish», JSON formatida).",
            "Noto‘g‘ri ma’lumotlarni tuzatish (profilni tahrirlash).",
            "Ma’lumotlarni o‘chirish yoki qayta ishlashni cheklash.",
            "Rozilikni istalgan vaqtda qaytarib olish (push-bildirishnomalarni o‘chirish).",
            "Qayta ishlashga e’tiroz bildirish va nazorat organiga shikoyat qilish.",
          ],
        },
        {
          title: "8. Bolalar maxfiyligi",
          paragraphs: [
            "Platforma 13 yoshga to‘lmagan bolalar uchun mo‘ljallanmagan. 13 yoshga to‘lmagan foydalanuvchi hisobini aniqlasak, uni o‘chirib tashlaymiz. Bolalar xavfsizligi bo‘yicha alohida hujjat: geters.uz/uz/child-safety.",
          ],
        },
        {
          title: "9. Cookie va lokal saqlash",
          paragraphs: [
            "Veb-sayt sessiyani saqlash uchun cookie fayllardan, til va mavzu tanlovini eslab qolish uchun lokal saqlashdan foydalanadi. Mobil ilova autentifikatsiya tokenini qurilmaning xavfsiz saqlash joyida (Keychain / EncryptedSharedPreferences) saqlaydi. Biz reklama maqsadida kuzatuvchi cookie fayllardan foydalanmaymiz.",
          ],
        },
        {
          title: "10. Xavfsizlik",
          paragraphs: [
            "Barcha tarmoq aloqalari TLS/HTTPS orqali shifrlanadi, parollar qaytarilmas xesh bilan saqlanadi, kirish huquqlari rol asosida cheklanadi. Shunga qaramay, internet orqali uzatishning hech bir usuli 100% xavfsiz emas.",
          ],
        },
        {
          title: "11. Xalqaro uzatish",
          paragraphs: [
            "Ma’lumotlar O‘zbekistondagi va xizmat provayderlarimiz joylashgan serverlarda qayta ishlanishi mumkin. Bunday holatda uzatish shartnoma va standart xavfsizlik choralari bilan himoyalanadi.",
          ],
        },
        {
          title: "12. Siyosat o‘zgarishlari",
          paragraphs: [
            "Ushbu siyosat yangilanishi mumkin. Muhim o‘zgarishlar haqida ilova ichida yoki email orqali xabar beramiz. Yangilangan sana hujjat boshida ko‘rsatiladi.",
          ],
        },
      ],
      contactLabel: "13. Bog‘lanish",
      back: "Orqaga",
      related: [
        { label: "Foydalanish shartlari", href: localePath("/terms") },
        { label: "Hamjamiyat qoidalari", href: localePath("/guidelines") },
        { label: "Bolalar xavfsizligi", href: localePath("/child-safety") },
        { label: "Hisobni o‘chirish", href: localePath("/account/delete") },
      ],
    },
    ru: {
      title: "Политика конфиденциальности",
      subtitle: "Для мобильного приложения Geters и сайта geters.uz",
      updated: "Последнее обновление: 1 ноября 2026 г.",
      intro:
        "Настоящая Политика конфиденциальности объясняет, какие персональные данные «Geters» (далее — «Платформа», «мы») собирает через Android-приложение, iOS-приложение и сайт geters.uz, как мы их используем, кому передаём и какие права у вас есть. Используя Платформу, вы соглашаетесь с настоящей политикой.",
      sections: [
        {
          title: "1. Какие данные мы собираем",
          bullets: [
            "Данные аккаунта: имя, имя пользователя (@handle), email или номер телефона, хеш пароля, Google ID при входе через Google.",
            "Данные профиля: должность/сфера, био, местоположение, ссылки (GitHub, LinkedIn, X, сайт), аватар и обложка.",
            "Созданный вами контент: посты, статьи, комментарии, лайки, сохранённые посты, личные сообщения, жалобы и их время.",
            "Технические данные: IP-адрес, модель устройства, версия ОС, версия приложения, язык, часовой пояс, журналы сбоев.",
            "Токен push-уведомлений (если вы разрешили) и настройки уведомлений.",
            "Платёжные данные: только статус подписки, ID продукта и ID транзакции при оплате через Google Play. Мы не видим и не храним номер банковской карты.",
          ],
        },
        {
          title: "2. Как мы используем данные",
          bullets: [
            "Создание аккаунта, аутентификация (Google Sign-In, сессионные токены) и безопасность.",
            "Показ контента, лента, рекомендации, поиск и персонализация уведомлений.",
            "Соблюдение правил сообщества: рассмотрение жалоб, выявление спама, мошенничества и незаконного контента.",
            "Управление подписками и проверка статуса оплаты.",
            "Улучшение сервиса: исправление сбоев, измерение производительности, тестирование функций.",
            "Выполнение требований закона и ответы на законные запросы органов.",
          ],
        },
        {
          title: "3. Правовые основания",
          paragraphs: [
            "Мы обрабатываем данные (а) для исполнения договора с вами, (б) на основании вашего согласия (например, push-уведомления), (в) в рамках законных интересов (безопасность, борьба со спамом, улучшение сервиса) и (г) для выполнения требований закона.",
          ],
        },
        {
          title: "4. Кому мы передаём данные",
          paragraphs: [
            "Мы не продаём ваши персональные данные. Данные передаются только сторонам, необходимым для работы сервиса:",
          ],
          bullets: [
            "Google (Google Sign-In и Google Play Billing) — аутентификация и оплата подписок.",
            "RevenueCat — управление статусом подписки (анонимный ID приложения и данные транзакции).",
            "Сервис push-уведомлений (OneSignal или аналогичный) — только токен устройства и текст уведомления.",
            "Провайдеры облачного хостинга, базы данных и хранения медиа — по нашим инструкциям.",
            "Правоохранительные органы — только при законном и обоснованном запросе.",
          ],
        },
        {
          title: "5. Сроки хранения",
          bullets: [
            "Данные хранятся, пока аккаунт активен.",
            "После удаления аккаунта персональные данные и созданный контент удаляются в течение 30 дней.",
            "В резервных копиях данные могут храниться до 30 дней, затем удаляются автоматически.",
            "Записи, обязательные по закону (платежи, решения модерации), хранятся в установленный законом срок.",
            "Анонимизированная статистика не позволяет идентифицировать личность и может храниться бессрочно.",
          ],
        },
        {
          title: "6. Удаление аккаунта и данных",
          paragraphs: [
            "В приложении: Профиль → Настройки → «Удалить аккаунт».",
            "Вне приложения: на странице geters.uz/ru/account/delete укажите email, телефон или @handle и отправьте запрос. Запрос рассматривается командой модерации и выполняется в течение 30 дней.",
            "Что удаляется: аккаунт, профиль, посты, комментарии, лайки, сохранённые, подписки, личные сообщения и токены устройств. В отдельных случаях остаётся только анонимизированная статистика.",
          ],
        },
        {
          title: "7. Ваши права",
          bullets: [
            "Получить копию данных (Настройки → «Экспорт данных», формат JSON).",
            "Исправить неверные данные (редактирование профиля).",
            "Удалить данные или ограничить обработку.",
            "Отозвать согласие в любой момент (отключить push-уведомления).",
            "Возразить против обработки и подать жалобу в надзорный орган.",
          ],
        },
        {
          title: "8. Конфиденциальность детей",
          paragraphs: [
            "Платформа не предназначена для детей младше 13 лет. Если мы обнаружим аккаунт ребёнка младше 13 лет, мы его удалим. Отдельный документ: geters.uz/ru/child-safety.",
          ],
        },
        {
          title: "9. Cookie и локальное хранилище",
          paragraphs: [
            "Сайт использует cookie для сессии и локальное хранилище для языка и темы. Мобильное приложение хранит токен аутентификации в защищённом хранилище устройства (Keychain / EncryptedSharedPreferences). Мы не используем рекламные трекинговые cookie.",
          ],
        },
        {
          title: "10. Безопасность",
          paragraphs: [
            "Все сетевые соединения шифруются через TLS/HTTPS, пароли хранятся в виде необратимого хеша, доступ ограничен по ролям. Тем не менее ни один способ передачи данных через интернет не является абсолютно безопасным.",
          ],
        },
        {
          title: "11. Международная передача",
          paragraphs: [
            "Данные могут обрабатываться на серверах в Узбекистане и у наших поставщиков услуг. Такая передача защищается договором и стандартными мерами безопасности.",
          ],
        },
        {
          title: "12. Изменения политики",
          paragraphs: [
            "Политика может обновляться. О существенных изменениях мы сообщим в приложении или по email. Дата обновления указывается в начале документа.",
          ],
        },
      ],
      contactLabel: "13. Контакты",
      back: "Назад",
      related: [
        { label: "Условия использования", href: localePath("/terms") },
        { label: "Правила сообщества", href: localePath("/guidelines") },
        { label: "Безопасность детей", href: localePath("/child-safety") },
        { label: "Удаление аккаунта", href: localePath("/account/delete") },
      ],
    },
    en: {
      title: "Privacy Policy",
      subtitle: "For the Geters mobile app and geters.uz website",
      updated: "Last updated: November 1, 2026",
      intro:
        "This Privacy Policy explains what personal data Geters (“the Platform”, “we”) collects through the Android app, iOS app and the geters.uz website, how we use it, who we share it with, and what rights you have. By using the Platform you agree to this policy.",
      sections: [
        {
          title: "1. Data we collect",
          bullets: [
            "Account data: name, handle, email or phone number, password hash, and Google ID when you sign in with Google.",
            "Profile data: role/field, bio, location, links (GitHub, LinkedIn, X, website), avatar and cover image.",
            "Content you create: posts, articles, comments, likes, saved posts, direct messages, reports and their timestamps.",
            "Device and technical data: IP address, device model, OS version, app version, language, time zone, crash logs.",
            "Push notification token (if you allow it) and notification preferences.",
            "Purchase data: only subscription status, product ID and transaction ID for Google Play purchases. We never see or store your card number.",
          ],
        },
        {
          title: "2. How we use data",
          bullets: [
            "Creating accounts, authentication (Google Sign-In, session tokens) and security.",
            "Showing content, feed, recommendations, search and personalized notifications.",
            "Enforcing community rules: reviewing reports and detecting spam, fraud and illegal content.",
            "Managing subscriptions and verifying payment status.",
            "Improving the service: fixing crashes, measuring performance and testing features.",
            "Complying with legal obligations and responding to lawful requests from authorities.",
          ],
        },
        {
          title: "3. Legal bases",
          paragraphs: [
            "We process data (a) to perform our contract with you, (b) based on your consent (for example push notifications), (c) for our legitimate interests (security, anti-spam, service improvement), and (d) to comply with legal obligations.",
          ],
        },
        {
          title: "4. Who we share data with",
          paragraphs: [
            "We do not sell your personal data. Data is shared only with parties required to run the service:",
          ],
          bullets: [
            "Google (Google Sign-In and Google Play Billing) for authentication and subscription payments.",
            "RevenueCat to manage subscription status (anonymous app user ID and transaction data only).",
            "A push notification provider (OneSignal or similar) receiving only the device token and message.",
            "Cloud hosting, database and media storage providers acting on our instructions.",
            "Law enforcement only in response to a lawful and justified request.",
          ],
        },
        {
          title: "5. Retention",
          bullets: [
            "Data is kept while your account is active.",
            "After account deletion, personal data and your content are removed within 30 days.",
            "Backups may retain data for up to 30 days before automatic deletion.",
            "Records required by law (payments, moderation decisions) are kept for the legally required period.",
            "Anonymized aggregated statistics cannot identify you and may be kept indefinitely.",
          ],
        },
        {
          title: "6. Deleting your account and data",
          paragraphs: [
            "In the app: Profile → Settings → “Delete account”.",
            "Outside the app: visit geters.uz/en/account/delete, enter your email, phone number or @handle and submit the request. Our moderation team reviews it and completes deletion within 30 days.",
            "What is deleted: account record, profile, posts, comments, likes, saved items, follows, direct messages and device tokens. In some cases only anonymized statistics remain.",
          ],
        },
        {
          title: "7. Your rights",
          bullets: [
            "Obtain a copy of your data (Settings → “Export data”, JSON format).",
            "Correct inaccurate data (edit your profile).",
            "Delete data or restrict processing.",
            "Withdraw consent at any time (disable push notifications).",
            "Object to processing and lodge a complaint with a supervisory authority.",
          ],
        },
        {
          title: "8. Children’s privacy",
          paragraphs: [
            "The Platform is not intended for children under 13. If we identify an account belonging to a child under 13, we delete it. See our dedicated document: geters.uz/en/child-safety.",
          ],
        },
        {
          title: "9. Cookies and local storage",
          paragraphs: [
            "The website uses cookies for sessions and local storage for language and theme. The mobile app stores its authentication token in the device secure storage (Keychain / EncryptedSharedPreferences). We do not use advertising tracking cookies.",
          ],
        },
        {
          title: "10. Security",
          paragraphs: [
            "All network traffic is encrypted with TLS/HTTPS, passwords are stored as irreversible hashes, and access is role-restricted. No method of transmission over the internet is entirely secure.",
          ],
        },
        {
          title: "11. International transfers",
          paragraphs: [
            "Data may be processed on servers in Uzbekistan and at our service providers. Such transfers are protected by contracts and standard security measures.",
          ],
        },
        {
          title: "12. Changes to this policy",
          paragraphs: [
            "We may update this policy. We will announce material changes in the app or by email. The updated date appears at the top of this document.",
          ],
        },
      ],
      contactLabel: "13. Contact",
      back: "Back",
      related: [
        { label: "Terms of Service", href: localePath("/terms") },
        { label: "Community Guidelines", href: localePath("/guidelines") },
        { label: "Child Safety", href: localePath("/child-safety") },
        { label: "Delete account", href: localePath("/account/delete") },
      ],
    },
  };

  const current = content[locale] || content.en;

  return (
    <LegalDocument
      title={current.title}
      subtitle={current.subtitle}
      updated={current.updated}
      intro={current.intro}
      sections={current.sections}
      backHref={localePath("/dashboard")}
      backLabel={current.back}
      contactEmail={{ label: current.contactLabel, value: CONTACT_EMAIL }}
      relatedLinks={current.related}
    />
  );
}
