import type { Locale } from "@/lib/i18n/config";

export interface InterviewQuestion {
  question: Record<Locale, string>;
  difficulty: "junior" | "middle" | "senior";
  answer: Record<Locale, string>;
  codeExample?: string;
  interviewerTips?: Record<Locale, string>;
}

export interface InterviewPrepItem {
  slug: string;
  title: Record<Locale, string>;
  level: string;
  shortDescription: Record<Locale, string>;
  questions: InterviewQuestion[];
  relatedSlugs: string[];
}

export const INTERVIEW_PREP_DATA: InterviewPrepItem[] = [
  {
    slug: "frontend-react",
    title: {
      uz: "React va Zamonaviy Frontend Intervyu Savollari (2026)",
      ru: "Вопросы для собеседования по React и Frontend (2026)",
      en: "React & Modern Frontend Technical Interview Questions (2026)",
    },
    level: "Junior to Senior",
    shortDescription: {
      uz: "Virtual DOM, React 19 hooks, Server Components, holat boshqaruvi va unumdorlik optimizatsiyasi.",
      ru: "Virtual DOM, React 19 хуки, Server Components, управление состоянием и оптимизация производительности.",
      en: "Virtual DOM internals, React 19 hooks, Server Components, state architecture, and rendering performance.",
    },
    questions: [
      {
        question: {
          uz: "React 19 Server Components (RSC) va Client Components o'rtasidagi asosiy farq nima?",
          ru: "В чём ключевое отличие Server Components от Client Components в React 19?",
          en: "What is the primary architectural difference between Server and Client Components in React 19?",
        },
        difficulty: "middle",
        answer: {
          uz: "Server Components faqat serverda ishga tushadi, ularning JavaScript kodi mijoz brauzeriga umuman yuborilmaydi (0 bundle size). Ular to'g'ridan-to'g'ri ma'lumotlar bazasiga yoki fayl tizimiga ulanishi mumkin. Client Components esa ('use client' direktivasi) brauzerda interaktivlik (onClick, useState, useEffect) uchun ishlatiladi.",
          ru: "Server Components выполняются исключительно на сервере и не увеличивают клиентский JS-бандл. Они могут напрямую работать с БД. Client Components ('use client') гидратируются в браузере для обработки интерактивных событий (состояния, эффекты, клики).",
          en: "Server Components render exclusively on the server and introduce zero JavaScript overhead into the client bundle. They can securely access backend resources directly. Client Components (marked with 'use client') hydrate in the browser to support interactivity and DOM events.",
        },
        interviewerTips: {
          uz: "Nomzoddan 'use client' hamma komponent tepasiga qo'yilmasligi, faqat barg (leaf) interaktiv komponentlarga ajratilishi kerakligini bilishini so'rang.",
          ru: "Обратите внимание, понимает ли кандидат, что 'use client' следует выносить в листовые компоненты для минимизации бандла.",
          en: "Verify that the candidate knows 'use client' boundary should be pushed down to leaf nodes rather than decorating root layouts.",
        },
      },
      {
        question: {
          uz: "React'da useCallback va useMemo qachon ishlatilishi kerak va qachon ortiqcha hisoblanadi?",
          ru: "Когда необходимо использовать useCallback и useMemo, а когда это преждевременная оптимизация?",
          en: "When should useCallback and useMemo actually be used, and when do they represent premature optimization?",
        },
        difficulty: "middle",
        answer: {
          uz: "useMemo va useCallback xotira va hisoblash resursi talab qiladi. Ular faqat ikkita holatda zarur: 1) Hisoblash juda og'ir bo'lganda (katta massivlarni filtrlash); 2) Funksiya yoki obyekt React.memo bilan o'ralgan bola komponentga prop sifatida uzatilganda referensial tenglikni (===) saqlash uchun.",
          ru: "Они нужны только в двух случаях: 1) Дорогие математические расчеты; 2) Сохранение ссылочной целостности объектов/функций, передаваемых в компоненты, обернутые в React.memo.",
          en: "They should be reserved for: 1) Expensive computations; 2) Preserving referential identity when passing props to components wrapped in React.memo or dependency arrays.",
        },
      },
      {
        question: {
          uz: "Virtual DOM qanday ishlaydi va Reconciliation algoritmi nima?",
          ru: "Как устроен Virtual DOM и как работает алгоритм сверки (Reconciliation)?",
          en: "How does the Virtual DOM work and what is the Reconciliation process?",
        },
        difficulty: "senior",
        answer: {
          uz: "Virtual DOM — bu haqiqiy brauzer DOM'ining xotiradagi engil JavaScript nusxasi. Holat o'zgarganda React yangi Virtual DOM daraxtini hosil qiladi va uni avvalgisi bilan solishtiradi (Diffing). Faqat o'zgargan tugunlar (patches) haqiqiy DOM'ga bitta operatsiyada yoziladi.",
          ru: "Virtual DOM — легковесное JS-дерево в памяти. При изменении состояния React сравнивает новое дерево со старым (diffing) и точечно обновляет реальный DOM, минимизируя reflow и repaint.",
          en: "The Virtual DOM is an in-memory representation of the real DOM. Upon state change, React computes a diff between the new and prior virtual trees and applies minimal batch mutations to the real DOM.",
        },
      },
    ],
    relatedSlugs: ["backend-system-design"],
  },
  {
    slug: "backend-system-design",
    title: {
      uz: "Backend va System Design Intervyu Savollari",
      ru: "Вопросы для собеседования по Backend и System Design",
      en: "Backend Engineering & System Design Interview Questions",
    },
    level: "Middle to Senior",
    shortDescription: {
      uz: "Ma'lumotlar bazasi masshtablash, kesh strategiyalari (Redis), rate limiting va asinxron navbatlar.",
      ru: "Масштабирование баз данных, стратегии кэширования (Redis), rate limiting и асинхронные очереди.",
      en: "Database scaling, caching topologies (Redis), rate limiting algorithms, and message queues.",
    },
    questions: [
      {
        question: {
          uz: "Ma'lumotlar bazasini qanday masshtablash mumkin (Vertical vs Horizontal, Sharding, Read Replicas)?",
          ru: "Как масштабировать реляционную базу данных при высоких нагрузках?",
          en: "How do you scale a relational database under heavy read/write loads?",
        },
        difficulty: "senior",
        answer: {
          uz: "1) Read-heavy tizimlarda Primary-Replica arxitekturasi qo'yiladi: barcha yozishlar Primary'ga, o'qishlar esa Replica'larga yo'naltiriladi; 2) Keshlash qatlami (Redis); 3) Juda katta jadvallarda Sharding (ma'lumotlarni user_id hash bo'yicha turli bazalarga bo'lish); 4) Indekslarni optimallashtirish va Connection Pooling (PgBouncer).",
          ru: "1) Read Replicas для распределения чтений; 2) Кэширование запросов в Redis; 3) Шардирование таблиц по ключу (user_id); 4) Оптимизация индексов и пул соединений (PgBouncer).",
          en: "1) Read replicas for read-dominated traffic; 2) In-memory cache layer (Redis); 3) Horizontal sharding across partition keys; 4) Connection pooling and index optimization.",
        },
      },
    ],
    relatedSlugs: ["frontend-react"],
  },
];

export function getInterviewPrepBySlug(slug: string): InterviewPrepItem | undefined {
  return INTERVIEW_PREP_DATA.find((item) => item.slug === slug);
}
