"use client";

import React from "react";
import { useI18n } from "@/lib/i18n/context";
import { LegalDocument, type LegalSection } from "@/components/legal/legal-document";

const CONTACT_EMAIL = "support@thegogetters.uz";

export default function ChildSafetyPage() {
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
      title: "Bolalar Xavfsizligi Standartlari",
      subtitle: "Google Play Child Safety Standards talabiga muvofiq",
      updated: "Oxirgi yangilanish: 2026-yil 1-noyabr",
      intro:
        "Geters bolalarga nisbatan har qanday zo‘ravonlik va ekspluatatsiyaga nol tolerantlik bilan yondashadi. Ushbu hujjat platformada bolalar xavfsizligini ta’minlash bo‘yicha qabul qilingan choralar va xabar berish tartibini belgilaydi.",
      sections: [
        {
          title: "1. Nol tolerantlik siyosati",
          paragraphs: [
            "Bolalarga nisbatan jinsiy zo‘ravonlik yoki ekspluatatsiya (CSAE) va bolaga zarar yetkazuvchi har qanday kontent platformada qat’iyan taqiqlanadi. Bunday kontent aniqlanganda darhol o‘chiriladi, hisob butunlay bloklanadi va holat huquqni muhofaza qiluvchi organlarga xabar qilinadi.",
          ],
        },
        {
          title: "2. Taqiqlangan kontent",
          bullets: [
            "CSAE, grooming (bolani aldab yaqinlashish) yoki bolani ekspluatatsiya qilishning har qanday ko‘rinishi.",
            "Bolalarni jalb qiluvchi kattalar uchun kontent yoki bunday kontentga havolalar.",
            "Bolaga nisbatan tahdid, qo‘rqitish, kamsitish yoki zo‘ravonlikni targ‘ib qilish.",
            "Bola shaxsiy ma’lumotlarini (manzil, maktab, telefon) ochiq joylashtirish.",
          ],
        },
        {
          title: "3. Moderatsiya va tekshiruv",
          bullets: [
            "Shikoyatlar 24 soat ichida ko‘rib chiqiladi, bolalar xavfsizligiga oid shikoyatlar ustuvor hisoblanadi.",
            "Avtomatik filtrlar va qo‘lda moderatsiya birgalikda ishlatiladi.",
            "Tasdiqlangan holatlar to‘g‘risida vakolatli organlarga (huquqni muhofaza qiluvchi organlar, tegishli milliy va xalqaro tashkilotlar) xabar beriladi.",
          ],
        },
        {
          title: "4. Qanday xabar berish mumkin",
          bullets: [
            "Ilova ichida: post, izoh yoki foydalanuvchi menyusidagi «Shikoyat qilish» tugmasi orqali «Nomaqbul kontent» sababini tanlang.",
            "Ilovadan tashqarida: support@thegogetters.uz manziliga «Child Safety» mavzusi bilan yozing.",
            "Xabarda kontent havolasi yoki foydalanuvchi @handle ni ko‘rsating — bu tekshiruvni tezlashtiradi.",
          ],
        },
        {
          title: "5. Foydalanuvchini bloklash",
          paragraphs: [
            "Har qanday foydalanuvchini bloklashingiz mumkin: Sozlamalar → Maxfiylik → Bloklangan foydalanuvchilar. Bloklangandan so‘ng uning kontenti, izohlari va shaxsiy xabarlari sizga ko‘rinmaydi.",
          ],
        },
        {
          title: "6. Yosh chegarasi va ota-ona nazorati",
          paragraphs: [
            "Platforma 13 yoshga to‘lmagan bolalar uchun mo‘ljallanmagan. 13 yoshga to‘lmagan foydalanuvchi hisobi aniqlansa, u o‘chiriladi. Ota-onalarga Google Family Link kabi vositalar orqali qurilma va ilova foydalanishini nazorat qilish tavsiya etiladi.",
          ],
        },
        {
          title: "7. Mas’ul aloqa",
          paragraphs: [
            "Bolalar xavfsizligi bo‘yicha mas’ul shaxs: Geters Trust & Safety jamoasi. Murojaatlar support@thegogetters.uz manziliga «Child Safety» mavzusi bilan yuboriladi va 24 soat ichida ko‘rib chiqiladi.",
          ],
        },
      ],
      contactLabel: "8. Bog‘lanish",
      back: "Orqaga",
      related: [
        { label: "Foydalanish shartlari", href: localePath("/terms") },
        { label: "Hamjamiyat qoidalari", href: localePath("/guidelines") },
        { label: "Maxfiylik siyosati", href: localePath("/privacy") },
      ],
    },
    ru: {
      title: "Стандарты безопасности детей",
      subtitle: "В соответствии с требованиями Google Play Child Safety Standards",
      updated: "Последнее обновление: 1 ноября 2026 г.",
      intro:
        "Geters применяет нулевую терпимость к любому насилию и эксплуатации детей. Настоящий документ описывает меры по обеспечению безопасности детей на платформе и порядок сообщения о нарушениях.",
      sections: [
        {
          title: "1. Политика нулевой терпимости",
          paragraphs: [
            "Сексуальная эксплуатация и насилие над детьми (CSAE) и любой контент, вредящий ребёнку, строго запрещены. При обнаружении контент немедленно удаляется, аккаунт блокируется навсегда, а случай передаётся в правоохранительные органы.",
          ],
        },
        {
          title: "2. Запрещённый контент",
          bullets: [
            "CSAE, груминг и любые формы эксплуатации детей.",
            "Контент для взрослых с участием детей или ссылки на него.",
            "Угрозы, запугивание, дискриминация или пропаганда насилия против детей.",
            "Публикация личных данных ребёнка (адрес, школа, телефон).",
          ],
        },
        {
          title: "3. Модерация и проверка",
          bullets: [
            "Жалобы рассматриваются в течение 24 часов; жалобы о безопасности детей имеют приоритет.",
            "Используются автоматические фильтры и ручная модерация.",
            "Подтверждённые случаи передаются в компетентные органы (правоохранительные и профильные организации).",
          ],
        },
        {
          title: "4. Как сообщить",
          bullets: [
            "В приложении: «Пожаловаться» в меню поста, комментария или пользователя, причина «Неприемлемый контент».",
            "Вне приложения: письмо на support@thegogetters.uz с темой «Child Safety».",
            "Укажите ссылку на контент или @handle пользователя — это ускорит проверку.",
          ],
        },
        {
          title: "5. Блокировка пользователя",
          paragraphs: [
            "Вы можете заблокировать любого пользователя: Настройки → Приватность → Заблокированные. После блокировки его контент, комментарии и личные сообщения вам не видны.",
          ],
        },
        {
          title: "6. Возраст и родительский контроль",
          paragraphs: [
            "Платформа не предназначена для детей младше 13 лет. Аккаунт ребёнка младше 13 лет удаляется. Родителям рекомендуется использовать Google Family Link для контроля устройств и приложений.",
          ],
        },
        {
          title: "7. Ответственный контакт",
          paragraphs: [
            "Ответственная команда: Geters Trust & Safety. Обращения направляются на support@thegogetters.uz с темой «Child Safety» и рассматриваются в течение 24 часов.",
          ],
        },
      ],
      contactLabel: "8. Контакты",
      back: "Назад",
      related: [
        { label: "Условия использования", href: localePath("/terms") },
        { label: "Правила сообщества", href: localePath("/guidelines") },
        { label: "Политика конфиденциальности", href: localePath("/privacy") },
      ],
    },
    en: {
      title: "Child Safety Standards",
      subtitle: "Aligned with Google Play Child Safety Standards requirements",
      updated: "Last updated: November 1, 2026",
      intro:
        "Geters has zero tolerance for any abuse or exploitation of children. This document sets out the measures we take to keep children safe on the platform and how to report violations.",
      sections: [
        {
          title: "1. Zero-tolerance policy",
          paragraphs: [
            "Child sexual abuse material or exploitation (CSAE) and any content that harms a child are strictly prohibited. When identified, the content is removed immediately, the account is permanently banned, and the case is reported to law enforcement.",
          ],
        },
        {
          title: "2. Prohibited content",
          bullets: [
            "CSAE, grooming and any form of child exploitation.",
            "Adult content involving children, or links to it.",
            "Threats, intimidation, discrimination or promotion of violence against children.",
            "Publishing a child’s personal data (address, school, phone number).",
          ],
        },
        {
          title: "3. Moderation and review",
          bullets: [
            "Reports are reviewed within 24 hours; child-safety reports are prioritized.",
            "Automated filters work together with manual moderation.",
            "Confirmed cases are reported to the competent authorities (law enforcement and relevant organizations).",
          ],
        },
        {
          title: "4. How to report",
          bullets: [
            "In the app: tap “Report” in the menu of a post, comment or user and choose “Inappropriate content”.",
            "Outside the app: email support@thegogetters.uz with the subject “Child Safety”.",
            "Include the content link or the user’s @handle to speed up the review.",
          ],
        },
        {
          title: "5. Blocking a user",
          paragraphs: [
            "You can block any user: Settings → Privacy → Blocked users. Once blocked, their content, comments and direct messages are hidden from you.",
          ],
        },
        {
          title: "6. Age limit and parental controls",
          paragraphs: [
            "The platform is not intended for children under 13. Accounts belonging to children under 13 are deleted. Parents are encouraged to use tools such as Google Family Link to manage device and app usage.",
          ],
        },
        {
          title: "7. Responsible contact",
          paragraphs: [
            "Responsible team: Geters Trust & Safety. Requests go to support@thegogetters.uz with the subject “Child Safety” and are reviewed within 24 hours.",
          ],
        },
      ],
      contactLabel: "8. Contact",
      back: "Back",
      related: [
        { label: "Terms of Service", href: localePath("/terms") },
        { label: "Community Guidelines", href: localePath("/guidelines") },
        { label: "Privacy Policy", href: localePath("/privacy") },
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
