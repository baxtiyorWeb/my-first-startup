"use client";

import React from "react";
import { useI18n } from "@/lib/i18n/context";
import { LegalDocument, type LegalSection } from "@/components/legal/legal-document";

const CONTACT_EMAIL = "support@thegogetters.uz";

export default function TermsPage() {
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
      title: "Foydalanish Shartlari",
      subtitle: "Geters mobil ilovasi va geters.uz veb-sayti uchun",
      updated: "Kuchga kirish sanasi: 2026-yil 1-noyabr",
      intro:
        "Ushbu Foydalanish shartlari («Shartlar») Geters platformasidan foydalanish shartlarini belgilaydi. Hisob yaratish yoki platformadan foydalanish orqali siz ushbu Shartlarga, Maxfiylik siyosatiga va Hamjamiyat qoidalariga to‘liq rozilik bildirasiz. Agar rozil bo‘lmasangiz, platformadan foydalanmang.",
      sections: [
        {
          title: "1. Yosh chegarasi va hisob",
          bullets: [
            "Platformadan foydalanish uchun kamida 13 yoshda bo‘lishingiz kerak. 13–18 yoshdagi foydalanuvchilar ota-ona yoki vasiyning roziligi bilan foydalanishi lozim.",
            "Hisob ma’lumotlari (parol, sessiya) maxfiy saqlanishi va uchinchi shaxsga berilmasligi kerak.",
            "Bir shaxs nomidan soxta hisob ochish, boshqa birovning identifikatorini o‘zlashtirish taqiqlanadi.",
            "Hisobingiz orqali amalga oshirilgan barcha harakatlar uchun siz javobgarsiz.",
          ],
        },
        {
          title: "2. Taqiqlangan kontent va xatti-harakatlar",
          paragraphs: [
            "Platforma foydalanuvchilar tomonidan yaratiladigan kontentni (UGC) o‘z ichiga oladi. Quyidagilar qat’iyan taqiqlanadi va darhol o‘chiriladi, hisob esa to‘xtatiladi:",
          ],
          bullets: [
            "Bolalarga nisbatan jinsiy zo‘ravonlik yoki ekspluatatsiya (CSAE) — hech qanday istisnosiz. Bunday kontent aniqlansa, darhol o‘chiriladi va vakolatli organlarga xabar beriladi.",
            "Haqorat, tahdid, nafrat nutqi, kamsitish (irq, jins, din, millat, orientatsiya, nogironlik asosida).",
            "Zo‘ravonlik, o‘z joniga qasd qilishga undash, terrorizm yoki noqonuniy faoliyatni targ‘ib qilish.",
            "Spam, firibgarlik, fishing, moliyaviy piramida, ruxsatsiz reklama.",
            "Boshqalarning mualliflik huquqi, savdo belgisi yoki shaxsiy ma’lumotlarini buzish.",
            "Kattalar uchun kontent, qurol, giyohvand moddalar yoki retseptsiz dori savdosi.",
          ],
        },
        {
          title: "3. Moderatsiya, shikoyat va bloklash",
          bullets: [
            "Har qanday post, izoh yoki foydalanuvchi ustidagi menyu orqali «Shikoyat qilish» tugmasini bosib shikoyat yuborishingiz mumkin.",
            "Shikoyatlar moderatsiya jamoasi tomonidan 24 soat ichida ko‘rib chiqiladi.",
            "Qoidabuzar kontent olib tashlanadi, takroriy buzilishlarda hisob vaqtincha yoki butunlay bloklanadi.",
            "Istalgan foydalanuvchini bloklashingiz mumkin: Sozlamalar → Maxfiylik → Bloklangan foydalanuvchilar. Bloklangandan so‘ng uning kontenti va xabarlari sizga ko‘rinmaydi.",
            "Moderatsiya qarorlaridan norozi bo‘lsangiz, support@thegogetters.uz manziliga murojaat qilishingiz mumkin.",
          ],
        },
        {
          title: "4. Bolalar xavfsizligi",
          paragraphs: [
            "Biz CSAE va bolalarga zarar yetkazuvchi har qanday kontentga nisbatan nol tolerantlik siyosatini yuritamiz. Bunday kontentni aniqlash uchun avtomatik va qo‘lda moderatsiyadan foydalanamiz, aniqlangan holatlarni huquqni muhofaza qiluvchi organlarga va tegishli tashkilotlarga xabar qilamiz. Batafsil: geters.uz/uz/child-safety.",
          ],
        },
        {
          title: "5. Sizning kontentingiz va litsenziya",
          paragraphs: [
            "Siz yaratgan kontentga bo‘lgan huquqlar sizda qoladi. Platformaga kontentni joylashtirish orqali bizga uni saqlash, ko‘rsatish, tarqatish va xizmatni ta’minlash uchun zarur bo‘lgan darajada qayta ishlash uchun butun dunyo bo‘ylab, bepul, oddiy (non-exclusive) litsenziya berasiz. Hisobni o‘chirganingizda ushbu litsenziya tugaydi, faqat zaxira nusxalarda qolishi mumkin.",
          ],
        },
        {
          title: "6. Mualliflik huquqini buzish (DMCA)",
          paragraphs: [
            "Agar sizning mualliflik huquqingiz buzilgan deb hisoblasangiz, kontent havolasi, huquq egaligini tasdiqlovchi ma’lumot va aloqa ma’lumotlari bilan support@thegogetters.uz manziliga yozing. Asoslangan shikoyat bo‘yicha kontent olib tashlanadi.",
          ],
        },
        {
          title: "7. Obunalar va to‘lovlar",
          bullets: [
            "Pullik obunalar Google Play orqali amalga oshiriladi va Google Play shartlariga bo‘ysunadi.",
            "Obuna avtomatik yangilanadi; bekor qilish Google Play → Obunalar bo‘limidan amalga oshiriladi.",
            "To‘lovni qaytarish masalalari Google Play siyosati asosida hal qilinadi.",
            "Biz narxlar va reja tarkibini oldindan xabar bergan holda o‘zgartirish huquqini saqlaymiz.",
          ],
        },
        {
          title: "8. Hisobni to‘xtatish va o‘chirish",
          paragraphs: [
            "Siz istalgan vaqtda hisobingizni o‘chirishingiz mumkin (Sozlamalar → Hisobni o‘chirish yoki geters.uz/uz/account/delete). Biz Shartlar buzilganda, qonuniy talab bo‘lganda yoki xavfsizlik uchun hisobni to‘xtatishga haqlimiz. Hisob o‘chirilganda ma’lumotlar Maxfiylik siyosatida ko‘rsatilgan tartibda o‘chiriladi.",
          ],
        },
        {
          title: "9. Javobgarlikni cheklash",
          paragraphs: [
            "Platforma «mavjud holatida» taqdim etiladi. Foydalanuvchilar tomonidan joylashtirilgan kontent uchun muallif javobgar. Biz uzluksiz ishlashni kafolatlamaymiz va bilvosita, tasodifiy yoki natijaviy zararlar uchun javobgarlikni o‘z zimmamizga olmaymiz. Bu cheklovlar amaldagi qonun ruxsat bergan doirada qo‘llanadi.",
          ],
        },
        {
          title: "10. Amaldagi qonun va nizolarni hal qilish",
          paragraphs: [
            "Ushbu Shartlar O‘zbekiston Respublikasi qonunchiligi bilan tartibga solinadi. Nizolar muzokaralar yo‘li bilan, kelishuvga erishilmasa, O‘zbekiston Respublikasi vakolatli sudlarida hal qilinadi.",
          ],
        },
        {
          title: "11. Shartlarning o‘zgarishi",
          paragraphs: [
            "Biz Shartlarni yangilashimiz mumkin. Muhim o‘zgarishlar haqida kamida 7 kun oldin ilova ichida yoki email orqali xabar beramiz. O‘zgarishdan keyin platformadan foydalanishni davom ettirish yangi Shartlarga rozilik hisoblanadi.",
          ],
        },
      ],
      contactLabel: "12. Bog‘lanish",
      back: "Orqaga",
      related: [
        { label: "Maxfiylik siyosati", href: localePath("/privacy") },
        { label: "Hamjamiyat qoidalari", href: localePath("/guidelines") },
        { label: "Bolalar xavfsizligi", href: localePath("/child-safety") },
        { label: "Hisobni o‘chirish", href: localePath("/account/delete") },
      ],
    },
    ru: {
      title: "Условия использования",
      subtitle: "Для мобильного приложения Geters и сайта geters.uz",
      updated: "Дата вступления в силу: 1 ноября 2026 г.",
      intro:
        "Настоящие Условия использования («Условия») определяют правила использования платформы Geters. Создавая аккаунт или используя платформу, вы полностью соглашаетесь с Условиями, Политикой конфиденциальности и Правилами сообщества. Если вы не согласны, не используйте платформу.",
      sections: [
        {
          title: "1. Возраст и аккаунт",
          bullets: [
            "Для использования платформы вам должно быть не менее 13 лет. Пользователи 13–18 лет должны иметь согласие родителей или опекуна.",
            "Данные аккаунта (пароль, сессия) должны храниться в тайне и не передаваться третьим лицам.",
            "Создание поддельных аккаунтов и присвоение чужой личности запрещены.",
            "Вы несёте ответственность за все действия, совершённые через ваш аккаунт.",
          ],
        },
        {
          title: "2. Запрещённый контент и поведение",
          paragraphs: [
            "Платформа содержит пользовательский контент (UGC). Следующее строго запрещено: контент удаляется, аккаунт блокируется:",
          ],
          bullets: [
            "Сексуальная эксплуатация и насилие над детьми (CSAE) — без каких-либо исключений. Такой контент удаляется немедленно, о случае сообщается в компетентные органы.",
            "Оскорбления, угрозы, язык вражды, дискриминация (по расе, полу, религии, национальности, ориентации, инвалидности).",
            "Насилие, подстрекательство к самоубийству, терроризм или пропаганда незаконной деятельности.",
            "Спам, мошенничество, фишинг, финансовые пирамиды, несанкционированная реклама.",
            "Нарушение авторских прав, товарных знаков или личных данных других лиц.",
            "Контент для взрослых, торговля оружием, наркотиками или рецептурными лекарствами.",
          ],
        },
        {
          title: "3. Модерация, жалобы и блокировка",
          bullets: [
            "Нажмите «Пожаловаться» в меню любого поста, комментария или пользователя.",
            "Жалобы рассматриваются командой модерации в течение 24 часов.",
            "Нарушающий контент удаляется, при повторных нарушениях аккаунт блокируется временно или навсегда.",
            "Вы можете заблокировать любого пользователя: Настройки → Приватность → Заблокированные. После блокировки его контент и сообщения вам не видны.",
            "Если вы не согласны с решением модерации, напишите на support@thegogetters.uz.",
          ],
        },
        {
          title: "4. Безопасность детей",
          paragraphs: [
            "Мы придерживаемся нулевой терпимости к CSAE и любому контенту, вредящему детям. Мы используем автоматическую и ручную модерацию и сообщаем о выявленных случаях в правоохранительные органы. Подробнее: geters.uz/ru/child-safety.",
          ],
        },
        {
          title: "5. Ваш контент и лицензия",
          paragraphs: [
            "Права на созданный вами контент остаются у вас. Размещая контент, вы предоставляете нам всемирную, безвозмездную, неисключительную лицензию на его хранение, отображение и распространение в объёме, необходимом для работы сервиса. При удалении аккаунта лицензия прекращается, но может сохраняться в резервных копиях.",
          ],
        },
        {
          title: "6. Нарушение авторских прав (DMCA)",
          paragraphs: [
            "Если вы считаете, что нарушены ваши авторские права, напишите на support@thegogetters.uz, указав ссылку на контент, подтверждение прав и контактные данные. Обоснованная жалоба приводит к удалению контента.",
          ],
        },
        {
          title: "7. Подписки и платежи",
          bullets: [
            "Платные подписки оформляются через Google Play и подчиняются его условиям.",
            "Подписка продлевается автоматически; отмена — в Google Play → Подписки.",
            "Возврат средств регулируется политикой Google Play.",
            "Мы вправе изменять цены и состав планов, уведомив заранее.",
          ],
        },
        {
          title: "8. Приостановка и удаление аккаунта",
          paragraphs: [
            "Вы можете удалить аккаунт в любое время (Настройки → Удалить аккаунт или geters.uz/ru/account/delete). Мы вправе приостановить аккаунт при нарушении Условий, по требованию закона или в целях безопасности. При удалении данные удаляются в порядке, описанном в Политике конфиденциальности.",
          ],
        },
        {
          title: "9. Ограничение ответственности",
          paragraphs: [
            "Платформа предоставляется «как есть». Ответственность за пользовательский контент несёт его автор. Мы не гарантируем бесперебойную работу и не несём ответственности за косвенные, случайные или последующие убытки в пределах, допускаемых законом.",
          ],
        },
        {
          title: "10. Применимое право",
          paragraphs: [
            "Условия регулируются законодательством Республики Узбекистан. Споры решаются путём переговоров, а при отсутствии согласия — в компетентных судах Республики Узбекистан.",
          ],
        },
        {
          title: "11. Изменение условий",
          paragraphs: [
            "Мы можем обновлять Условия. О существенных изменениях сообщаем не менее чем за 7 дней в приложении или по email. Продолжение использования означает согласие с новой редакцией.",
          ],
        },
      ],
      contactLabel: "12. Контакты",
      back: "Назад",
      related: [
        { label: "Политика конфиденциальности", href: localePath("/privacy") },
        { label: "Правила сообщества", href: localePath("/guidelines") },
        { label: "Безопасность детей", href: localePath("/child-safety") },
        { label: "Удаление аккаунта", href: localePath("/account/delete") },
      ],
    },
    en: {
      title: "Terms of Service",
      subtitle: "For the Geters mobile app and geters.uz website",
      updated: "Effective date: November 1, 2026",
      intro:
        "These Terms of Service (“Terms”) govern your use of the Geters platform. By creating an account or using the platform you fully agree to these Terms, the Privacy Policy and the Community Guidelines. If you do not agree, do not use the platform.",
      sections: [
        {
          title: "1. Eligibility and account",
          bullets: [
            "You must be at least 13 years old to use the platform. Users aged 13–18 need consent from a parent or guardian.",
            "Your credentials (password, session) must stay confidential and must not be shared.",
            "Creating fake accounts or impersonating another person is prohibited.",
            "You are responsible for all activity performed through your account.",
          ],
        },
        {
          title: "2. Prohibited content and conduct",
          paragraphs: [
            "The platform contains user-generated content (UGC). The following is strictly prohibited; the content is removed and the account is suspended:",
          ],
          bullets: [
            "Child sexual abuse material or exploitation (CSAE) — with zero exceptions. Such content is removed immediately and reported to the competent authorities.",
            "Harassment, threats, hate speech, discrimination (based on race, sex, religion, nationality, orientation, disability).",
            "Violence, encouragement of self-harm, terrorism or promotion of illegal activity.",
            "Spam, fraud, phishing, financial pyramids, unauthorized advertising.",
            "Infringing copyright, trademarks or other people’s personal data.",
            "Adult content, trafficking of weapons, drugs or prescription medicines.",
          ],
        },
        {
          title: "3. Moderation, reporting and blocking",
          bullets: [
            "Tap “Report” in the menu of any post, comment or user.",
            "Reports are reviewed by our moderation team within 24 hours.",
            "Violating content is removed; repeat violations lead to temporary or permanent suspension.",
            "You can block any user: Settings → Privacy → Blocked users. Blocked users’ content and messages are hidden from you.",
            "If you disagree with a moderation decision, contact support@thegogetters.uz.",
          ],
        },
        {
          title: "4. Child safety",
          paragraphs: [
            "We apply a zero-tolerance policy toward CSAE and any content that harms children. We use automated and manual moderation and report identified cases to law enforcement. Details: geters.uz/en/child-safety.",
          ],
        },
        {
          title: "5. Your content and license",
          paragraphs: [
            "You retain ownership of the content you create. By posting content you grant us a worldwide, royalty-free, non-exclusive license to store, display and distribute it as needed to operate the service. The license ends when you delete your account, though copies may remain in backups.",
          ],
        },
        {
          title: "6. Copyright infringement (DMCA)",
          paragraphs: [
            "If you believe your copyright is infringed, email support@thegogetters.uz with the content link, proof of ownership and your contact details. Verified complaints lead to removal of the content.",
          ],
        },
        {
          title: "7. Subscriptions and payments",
          bullets: [
            "Paid subscriptions are purchased through Google Play and are subject to Google Play terms.",
            "Subscriptions renew automatically; cancel in Google Play → Subscriptions.",
            "Refunds are handled under Google Play policy.",
            "We may change prices and plan contents with prior notice.",
          ],
        },
        {
          title: "8. Suspension and deletion",
          paragraphs: [
            "You may delete your account at any time (Settings → Delete account or geters.uz/en/account/delete). We may suspend an account for violating these Terms, when required by law, or for security reasons. Deleted data is removed as described in the Privacy Policy.",
          ],
        },
        {
          title: "9. Limitation of liability",
          paragraphs: [
            "The platform is provided “as is”. Users are responsible for the content they post. We do not guarantee uninterrupted operation and are not liable for indirect, incidental or consequential damages to the extent permitted by law.",
          ],
        },
        {
          title: "10. Governing law",
          paragraphs: [
            "These Terms are governed by the laws of the Republic of Uzbekistan. Disputes are resolved through negotiation and, failing that, in the competent courts of the Republic of Uzbekistan.",
          ],
        },
        {
          title: "11. Changes to these Terms",
          paragraphs: [
            "We may update these Terms. Material changes are announced at least 7 days in advance in the app or by email. Continued use after a change constitutes acceptance.",
          ],
        },
      ],
      contactLabel: "12. Contact",
      back: "Back",
      related: [
        { label: "Privacy Policy", href: localePath("/privacy") },
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
