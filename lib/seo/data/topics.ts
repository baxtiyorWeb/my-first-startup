import type { Locale } from "@/lib/i18n/config";

export interface TopicItem {
  slug: string;
  category: "languages" | "frontend" | "backend" | "devops" | "ai" | "architecture";
  icon: string;
  title: Record<Locale, string>;
  shortDescription: Record<Locale, string>;
  fullOverview: Record<Locale, string>;
  keyFeatures: Record<Locale, string[]>;
  codeSnippet?: {
    language: string;
    code: string;
    description: Record<Locale, string>;
  };
  faq: Record<Locale, { question: string; answer: string }[]>;
  relatedSlugs: string[];
}

export const TOPICS_DATA: TopicItem[] = [
  {
    slug: "nextjs",
    category: "frontend",
    icon: "⚡",
    title: {
      uz: "Next.js 16 va Zamonaviy React Arxitekturasi",
      ru: "Next.js 16 и современная архитектура React",
      en: "Next.js 16 & Modern React Architecture",
    },
    shortDescription: {
      uz: "Server Components, App Router va enterprise darajadagi SSR/SSG veb-ilovalar ishlab chiqish.",
      ru: "Серверные компоненты, App Router и разработка масштабируемых SSR/SSG веб-приложений.",
      en: "Server Components, App Router and enterprise-grade SSR/SSG web application development.",
    },
    fullOverview: {
      uz: "Next.js — Vercel tomonidan yaratilgan eng ommabop React freymvorki bo'lib, Server-Side Rendering (SSR), Static Site Generation (SSG), Incremental Static Regeneration (ISR) va Server Actions imkoniyatlarini taqdim etadi. Next.js 16 da React 19 Server Components to'liq quvvatda ishlaydi.",
      ru: "Next.js — популярнейший React-фреймворк от Vercel с поддержкой Server-Side Rendering (SSR), Static Site Generation (SSG), ISR и Server Actions. В версии 16 реализована полная интеграция с React 19 Server Components.",
      en: "Next.js is the premier React framework created by Vercel, enabling Server-Side Rendering (SSR), Static Site Generation (SSG), ISR, and Server Actions. Next.js 16 natively leverages React 19 Server Components for ultimate performance.",
    },
    keyFeatures: {
      uz: [
        "React Server Components (RSC) orqali mijozga 0-bundle hajmi",
        "App Router va ichki joylashtirilgan layoutlar (Nested Layouts)",
        "Avtomatik SEO optimizatsiyasi va metadata API",
        "Edge va Node.js runtime quvvati",
        "Server Actions orqali qulay backend mutatsiyalari",
      ],
      ru: [
        "React Server Components (RSC) с нулевым клиентским бандлом",
        "App Router и вложенные макеты (Nested Layouts)",
        "Встроенная оптимизация SEO и Metadata API",
        "Поддержка Edge и Node.js runtime",
        "Server Actions для прямых мутаций без создания API роутов",
      ],
      en: [
        "React Server Components with zero-bundle overhead on client",
        "App Router and composable nested layouts",
        "Automated SEO optimization & native Metadata API",
        "Full support for Edge and Node.js runtimes",
        "Server Actions for clean data mutations without REST boilerplate",
      ],
    },
    codeSnippet: {
      language: "typescript",
      code: `// app/[locale]/page.tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Next.js 16 Enterprise Architecture',
  description: 'Scalable Next.js applications with Server Components',
};

export default async function Page() {
  return <h1>Fast & SEO-Friendly Next.js 16</h1>;
}`,
      description: {
        uz: "Next.js App Router da Server Component va Metadata namunasi",
        ru: "Пример Server Component и Metadata в Next.js App Router",
        en: "Server Component and Metadata example in Next.js App Router",
      },
    },
    faq: {
      uz: [
        {
          question: "Next.js 16 da SEO qanday sozlanadi?",
          answer:
            "Next.js da statik yoki dinamik generateMetadata funksiyasi orqali har bir sahifa uchun Title, Description, Canonical URL, OpenGraph va robots qoidalari o'rnatiladi.",
        },
        {
          question: "Next.js va oddiy React.js farqi nima?",
          answer:
            "React — bu UI kutubxona bo'lib, asosan mijozda ishlaydi (CSR). Next.js esa serverda render qilish (SSR, SSG), avtomatik marshrutlash va backend funksiyalarini taqdim etuvchi to'liq freymvorkdir.",
        },
      ],
      ru: [
        {
          question: "Как настроить SEO в Next.js 16?",
          answer:
            "Через экспорт объекта metadata или функции generateMetadata, которые автоматически формируют title, description, OpenGraph и теги индексации.",
        },
        {
          question: "В чём отличие Next.js от классического React?",
          answer:
            "React — библиотека клиентского рендеринга (CSR), а Next.js — полноценный фреймворк с SSR, SSG, роутингом и оптимизацией производительности.",
        },
      ],
      en: [
        {
          question: "How does SEO work in Next.js 16?",
          answer:
            "Via the built-in Metadata API and generateMetadata, dynamically supplying title, description, canonical links, OpenGraph, and JSON-LD schema.",
        },
        {
          question: "What is the difference between React and Next.js?",
          answer:
            "React is a client-side UI library, whereas Next.js provides full-stack capabilities including SSR, SSG, file-based routing, and built-in optimization.",
        },
      ],
    },
    relatedSlugs: ["react", "typescript", "nodejs"],
  },
  {
    slug: "python",
    category: "languages",
    icon: "🐍",
    title: {
      uz: "Python Dasturlash Tili: Asoslardan Sun'iy Intellektgacha",
      ru: "Язык программирования Python: от основ до искусственного интеллекта",
      en: "Python Programming: From Core Basics to Artificial Intelligence",
    },
    shortDescription: {
      uz: "O'qilishi oson sintaksis, ma'lumotlar tahlili, backend (FastAPI/Django) va zamonaviy AI/ML modellari.",
      ru: "Простой синтаксис, аналитика данных, backend (FastAPI, Django) и передовые AI/ML модели.",
      en: "Clean syntax, data science, backend development (FastAPI/Django), and cutting-edge AI/ML engineering.",
    },
    fullOverview: {
      uz: "Python — dunyodagi eng mashhur dasturlash tillaridan biri. Uning sodda va tushunarli sintaksisi tezkor prototiplash, sun'iy intellekt (PyTorch, TensorFlow, LLM kutubxonalari), backend mikroservislar va ma'lumotlar muhandisligida tengsizdir.",
      ru: "Python — один из самых популярных языков в мире. Его понятный синтаксис делает его лидером в сфере искусственного интеллекта (PyTorch, TensorFlow, LLM), бэкенд разработки и анализа больших данных.",
      en: "Python is a versatile, high-level language revered for readability. It dominates machine learning, LLM development, data analytics, and scalable backend services with FastAPI and Django.",
    },
    keyFeatures: {
      uz: [
        "Sodda, inson tushunishiga yaqin sintaksis",
        "Sun'iy intellekt va Machine Learning uchun boy ekotizim (NumPy, PyTorch)",
        "Yuqori unumdor zamonaviy API: FastAPI va Asynchronous Python",
        "Katta xalqaro hamjamiyat va kutubxonalar bazasi (PyPI)",
      ],
      ru: [
        "Лаконичный и читаемый синтаксис",
        "Богатая экосистема для AI и Machine Learning (NumPy, Pandas, PyTorch)",
        "Высокопроизводительные асинхронные веб-фреймворки (FastAPI)",
        "Огромное сообщество и миллионы готовых пакетов в PyPI",
      ],
      en: [
        "Intuitive and clean human-readable syntax",
        "Industry-standard ecosystem for AI & Machine Learning",
        "High-performance async APIs with FastAPI",
        "Vast ecosystem with hundreds of thousands of PyPI packages",
      ],
    },
    codeSnippet: {
      language: "python",
      code: `from fastapi import FastAPI

app = FastAPI(title="Go-getters AI Engine")

@app.get("/api/v1/predict")
async def predict_metric(query: str):
    return {"status": "success", "prediction": f"Processed: {query}"}`,
      description: {
        uz: "FastAPI bilan asinxron REST endpoint yaratish namunasi",
        ru: "Пример асинхронного REST API на FastAPI",
        en: "Async REST API endpoint example with FastAPI",
      },
    },
    faq: {
      uz: [
        {
          question: "Python o'rganish qiyinmi?",
          answer:
            "Yo'q, Python yangi boshlovchilar uchun eng qulay til hisoblanadi. Uning sintaksisi ingliz tilidagi oddiy jumlalarga juda yaqin.",
        },
        {
          question: "FastAPI yoki Django: qaysi birini tanlash kerak?",
          answer:
            "Mikroservislar, asinxronlik va REST API uchun FastAPI eng yaxshi tanlov. Katta, tayyor admin-panelli monolit loyihalar uchun esa Django qulay.",
        },
      ],
      ru: [
        {
          question: "Сложно ли учить Python начинающему?",
          answer:
            "Python считается одним из самых доступных языков благодаря чистому синтаксису и минимальному количеству синтаксического шума.",
        },
        {
          question: "Что выбрать: FastAPI или Django?",
          answer:
            "Для микросервисов, высокой скорости и API идеален FastAPI; для полноценных монолитов с готовой админкой — Django.",
        },
      ],
      en: [
        {
          question: "Is Python suitable for beginners?",
          answer:
            "Yes, Python's clean readability makes it the most beginner-friendly programming language in software engineering.",
        },
        {
          question: "FastAPI vs Django: which one to choose?",
          answer:
            "FastAPI is ideal for microservices and modern async APIs, while Django excels at monolithic apps requiring built-in ORM and admin dashboard.",
        },
      ],
    },
    relatedSlugs: ["ai-llm", "docker", "postgresql"],
  },
  {
    slug: "typescript",
    category: "languages",
    icon: "📘",
    title: {
      uz: "TypeScript: Ishonchli va Xavfsiz Kod Arxitekturasi",
      ru: "TypeScript: архитектура надежного и типобезопасного кода",
      en: "TypeScript: Reliable & Type-Safe Software Architecture",
    },
    shortDescription: {
      uz: "Statik tiplash, interfeyslar, generiklar va katta hajmdagi ilovalarni xatolarsiz qurish.",
      ru: "Статическая типизация, интерфейсы, дженерики и разработка масштабных приложений без ошибок.",
      en: "Static typing, generics, interfaces, and building resilient enterprise applications without runtime bugs.",
    },
    fullOverview: {
      uz: "TypeScript — Microsoft tomonidan JavaScript ustiga qurilgan qat'iy tiplangan til. U ishlab chiqish jarayonida (compile-time) xatolarni aniqlab, yirik jamoaviy loyihalarda barqarorlikni ta'minlaydi.",
      ru: "TypeScript — строго типизированный надмножество JavaScript от Microsoft. Позволяет отлавливать ошибки на этапе компиляции и делать рефакторинг безопасным.",
      en: "TypeScript is a strongly typed superset of JavaScript developed by Microsoft. It detects bugs at compile time and makes large-scale refactoring effortless and safe.",
    },
    keyFeatures: {
      uz: [
        "Kompilyatsiya vaqtida xatolarni aniqlash",
        "Kuchli IDE avto-to'ldirish (IntelliSense)",
        "Generiklar (Generics) va Type Narrowing",
        "React va Node.js bilan to'liq uyg'unlik",
      ],
      ru: [
        "Обнаружение ошибок на этапе компиляции",
        "Превосходный автокомплит в IDE",
        "Поддержка дженериков и расширенных типов",
        "Бесшовная интеграция с React и Node.js",
      ],
      en: [
        "Compile-time static type checking",
        "Superior IDE code completion and developer ergonomics",
        "Advanced generics and conditional types",
        "First-class citizen in React and Node.js ecosystems",
      ],
    },
    codeSnippet: {
      language: "typescript",
      code: `interface User<T = string> {
  id: string;
  name: string;
  role: "admin" | "developer" | "founder";
  metadata: T;
}

function processUser<T>(user: User<T>): string {
  return \`User \${user.name} [\${user.role}]\`;
}`,
      description: {
        uz: "TypeScript Generics va Strict Union Types namunasi",
        ru: "Пример дженериков и строгих объединений в TypeScript",
        en: "Generics and strict union types in TypeScript",
      },
    },
    faq: {
      uz: [
        {
          question: "Nega oddiy JavaScript o'rniga TypeScript ishlatish kerak?",
          answer:
            "TypeScript yirik kod bazalarida xatolarni 60% gacha kamaytiradi, kodni tushunishni osonlashtiradi va refaktoring qilishni xavfsiz qiladi.",
        },
      ],
      ru: [
        {
          question: "Зачем переходить на TypeScript с JavaScript?",
          answer:
            "TypeScript предотвращает опечатки и ошибки типизации, экономит время на отладку и документирует код на уровне типов.",
        },
      ],
      en: [
        {
          question: "Why use TypeScript over vanilla JavaScript?",
          answer:
            "TypeScript dramatically reduces production bugs, provides self-documenting code, and enables confident refactoring.",
        },
      ],
    },
    relatedSlugs: ["nextjs", "react", "nodejs"],
  },
  {
    slug: "postgresql",
    category: "backend",
    icon: "🐘",
    title: {
      uz: "PostgreSQL: Dunyodagi Eng Ilg'or Ochiq Kodli Ma'lumotlar Bazasi",
      ru: "PostgreSQL: самая продвинутая реляционная база данных",
      en: "PostgreSQL: The World's Most Advanced Open Source Relational Database",
    },
    shortDescription: {
      uz: "ACID tranzaksiyalari, JSONB, indekslar, to'liq matnli qidiruv va yuqori ishonchlilik.",
      ru: "ACID транзакции, JSONB, мощные индексы, полнотекстовый поиск и надежность хранения.",
      en: "ACID compliance, JSONB capabilities, high-performance indexing, and rock-solid reliability.",
    },
    fullOverview: {
      uz: "PostgreSQL — enterprise darajadagi relyatsion ma'lumotlar bazasi (RDBMS). U murakkab SQL so'rovlar, JSONB hujjatlar, spatial (PostGIS) ma'lumotlar va millionlab qatorlarni optimal indekslash imkoniyatini beradi.",
      ru: "PostgreSQL — мощная реляционная СУБД с открытым исходным кодом. Поддерживает расширенные типы данных, индексацию JSONB, геоданные (PostGIS) и транзакции корпоративного уровня.",
      en: "PostgreSQL is an enterprise-grade object-relational database system known for reliability, data integrity, JSONB support, and sophisticated concurrency.",
    },
    keyFeatures: {
      uz: [
        "To'liq ACID muvofiqligi",
        "JSONB orqali NoSQL moslashuvchanligi",
        "B-Tree, GIN, GiST va BRIN indekslash turlari",
        "Replikatsiya, sharding va Connection Pooling (PgBouncer)",
      ],
      ru: [
        "Полное соответствие принципам ACID",
        "Гибкость NoSQL благодаря JSONB",
        "Разнообразные типы индексов: B-Tree, GIN, GiST",
        "Репликация, пулинг соединений и отказоустойчивость",
      ],
      en: [
        "100% ACID compliance and concurrency",
        "Hybrid relational + NoSQL capabilities with JSONB",
        "Advanced indexing (B-Tree, GIN, GiST, BRIN)",
        "Enterprise replication and connection pooling",
      ],
    },
    codeSnippet: {
      language: "sql",
      code: `-- Tezkor qidiruv uchun GIN indeksi
CREATE INDEX idx_posts_search ON posts USING gin (to_tsvector('simple', content));

-- Analitik so'rov namunasi
SELECT author_id, COUNT(*) as post_count
FROM posts
GROUP BY author_id
HAVING COUNT(*) > 5
ORDER BY post_count DESC;`,
      description: {
        uz: "PostgreSQL da GIN indeksi va to'liq matnli qidiruv",
        ru: "Индекс GIN и полнотекстовый поиск в PostgreSQL",
        en: "GIN indexing and aggregation query in PostgreSQL",
      },
    },
    faq: {
      uz: [
        {
          question: "PostgreSQL va MySQL o'rtasidagi asosiy farq nima?",
          answer:
            "PostgreSQL murakkab ma'lumotlar turlari, JSONB, analitik so'rovlar va qat'iy standartlarga muvofiqlik bo'yicha kuchliroqdir.",
        },
      ],
      ru: [
        {
          question: "В чём преимущество PostgreSQL перед MySQL?",
          answer:
            "PostgreSQL обладает лучшей поддержкой JSONB, сложных аналитических функций, индексов GIN/GiST и строгим соблюдением стандартов SQL.",
        },
      ],
      en: [
        {
          question: "What is the key advantage of PostgreSQL over MySQL?",
          answer:
            "PostgreSQL offers superior JSONB support, advanced index types (GIN, BRIN), and strict adherence to SQL standards.",
        },
      ],
    },
    relatedSlugs: ["nodejs", "python", "docker"],
  },
  {
    slug: "docker",
    category: "devops",
    icon: "🐳",
    title: {
      uz: "Docker va Konteynerizatsiya Asoslari",
      ru: "Docker и основы контейнеризации приложений",
      en: "Docker & Containerization Fundamentals",
    },
    shortDescription: {
      uz: "Ilovalarni izolyatsiya qilish, Dockerfile, Docker Compose va 'mening kompyuterimda ishlagandi' muammosini yo'qotish.",
      ru: "Изоляция окружения, Dockerfile, Docker Compose и устранение проблем с развертыванием.",
      en: "Application isolation, Dockerfile optimization, multi-container Compose, and seamless deployments.",
    },
    fullOverview: {
      uz: "Docker — ilovalarni barcha kutubxonalari va muhiti bilan yagona konteynerga joylashtirib, har qanday serverda bir xil barqaror ishlashini ta'minlovchi platforma.",
      ru: "Docker — платформа контейнеризации, которая упаковывает приложение и его зависимости в изолированный образ, гарантируя одинаковую работу на любом сервере.",
      en: "Docker is an open-source platform that automates deploying applications inside lightweight, portable containers across development and production environments.",
    },
    keyFeatures: {
      uz: [
        "Yengil vaznli izolyatsiya (VM larga qaraganda 10x tezroq)",
        "Dockerfile orqali qayta tiklanuvchi muhit",
        "Docker Compose orqali ko'p konteynerli arxitektura",
        "CI/CD quvurlarida avtomatlashtirish qulayligi",
      ],
      ru: [
        "Легковесная изоляция процессов без оверхеда виртуальных машин",
        "Декларативное описание окружения в Dockerfile",
        "Оркестрация локального стека через Docker Compose",
        "Стандарт де-факто в современных пайплайнах CI/CD",
      ],
      en: [
        "Lightweight process isolation without hypervisor overhead",
        "Reproducible builds with multi-stage Dockerfiles",
        "Multi-container local orchestration with Docker Compose",
        "Seamless integration with modern CI/CD pipelines",
      ],
    },
    codeSnippet: {
      language: "dockerfile",
      code: `# Multi-stage Next.js Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
EXPOSE 3000
CMD ["node", "server.js"]`,
      description: {
        uz: "Next.js uchun engil vaznli Multi-stage Dockerfile namunasi",
        ru: "Пример легковесного Multi-stage Dockerfile для Next.js",
        en: "Lightweight multi-stage Dockerfile for Next.js",
      },
    },
    faq: {
      uz: [
        {
          question: "Docker va Virtual Mashina (VM) farqi nima?",
          answer:
            "Virtual mashina to'liq operatsion tizimni simulyatsiya qiladi va ko'p resurs talab qiladi. Docker esa asosiy operatsion tizim yadrosini (kernel) ulashgan holda faqat jarayonlarni izolyatsiya qiladi.",
        },
      ],
      ru: [
        {
          question: "Чем Docker отличается от виртуальных машин?",
          answer:
            "Контейнеры делят ядро хостовой ОС, запускаясь за секунды и потребляя в разы меньше оперативной памяти по сравнению с VM.",
        },
      ],
      en: [
        {
          question: "What is the difference between Docker and a Virtual Machine?",
          answer:
            "Containers share the host OS kernel and isolate processes, making them significantly lighter and faster to boot than virtual machines.",
        },
      ],
    },
    relatedSlugs: ["postgresql", "nodejs", "python"],
  },
  {
    slug: "git",
    category: "devops",
    icon: "🌲",
    title: {
      uz: "Git Versiyalar Boshqaruvi va Team Workflow",
      ru: "Система контроля версий Git и командная разработка",
      en: "Git Version Control & Professional Team Workflows",
    },
    shortDescription: {
      uz: "Branching strategiyalari, Git flow, rebase vs merge, stashing va konfliktlarni yechish.",
      ru: "Ветвление, Git flow, rebase против merge, stash и разрешение конфликтов слияния.",
      en: "Branching models, trunk-based development, interactive rebase, and conflict resolution.",
    },
    fullOverview: {
      uz: "Git — dasturiy ta'minot yaratishda kod o'zgarishlarini kuzatib boruvchi, filiallar bilan parallel ishlash va jamoaviy hamkorlikni ta'minlovchi taqsimlangan versiyalar tizimi.",
      ru: "Git — распределенная система контроля версий, стандарт индустрии для отслеживания изменений исходного кода и командной разработки.",
      en: "Git is a distributed version control system tracking changes in source code during software development, empowering teams to collaborate without conflict.",
    },
    keyFeatures: {
      uz: [
        "Taqsimlangan (distributed) arxitektura",
        "Tezkor branching va merging",
        "Git stash, cherry-pick va rebase vositalari",
        "GitHub, GitLab bilan avtomatik integratsiya",
      ],
      ru: [
        "Распределенная архитектура",
        "Мгновенное создание и слияние веток",
        "Продвинутые команды: rebase, cherry-pick, stash",
        "Интеграция с GitHub, GitLab и системами CI/CD",
      ],
      en: [
        "Distributed architecture with full offline history",
        "Frictionless branch management and merge flows",
        "Powerful utilities: interactive rebase, cherry-pick, reflog",
        "Ecosystem compatibility with GitHub, GitLab, Bitbucket",
      ],
    },
    codeSnippet: {
      language: "bash",
      code: `# Toza git tarixi uchun rebase
git checkout feature/awesome-feature
git fetch origin
git rebase origin/main

# Xatolik yuz berganda avvalgi holatga qaytish
git reflog
git reset --hard HEAD@{1}`,
      description: {
        uz: "Git rebase va reflog yordamida xavfsiz ishlash",
        ru: "Безопасная работа с Git rebase и reflog",
        en: "Safe workflows with Git rebase and reflog",
      },
    },
    faq: {
      uz: [
        {
          question: "Git Merge va Git Rebase farqi nima?",
          answer:
            "Merge alohida 'merge commit' yaratib tarixni saqlaydi. Rebase esa filialdagi commitlarni asosiy filialning uchiga ko'chirib, chiziqli va toza tarix yaratadi.",
        },
      ],
      ru: [
        {
          question: "В чём разница между Git Merge и Git Rebase?",
          answer:
            "Merge создает коммит слияния, сохраняя историю ветки, а Rebase переносит ваши коммиты поверх целевой ветки, создавая линейную историю.",
        },
      ],
      en: [
        {
          question: "What is the difference between Merge and Rebase?",
          answer:
            "Merge preserves branch history by creating a merge commit, while Rebase rewrites history to create a clean, linear commit log.",
        },
      ],
    },
    relatedSlugs: ["docker", "typescript", "nextjs"],
  },
  {
    slug: "ai-llm",
    category: "ai",
    icon: "🧠",
    title: {
      uz: "Sun'iy Intellekt, LLM va AI Agentlar Arxitekturasi",
      ru: "Искусственный интеллект, LLM и архитектура AI-агентов",
      en: "Artificial Intelligence, Large Language Models & Agentic Architecture",
    },
    shortDescription: {
      uz: "Gemini API, Prompt Engineering, RAG (Retrieval-Augmented Generation) va avtonom agentlar.",
      ru: "Gemini API, промпт-инжиниринг, RAG архитектура и автономные AI-агенты.",
      en: "Gemini API, prompt engineering, RAG pipelines, function calling, and autonomous agents.",
    },
    fullOverview: {
      uz: "Katta til modellari (LLM) dasturiy ta'minot yaratish jarayonini tubdan o'zgartirmoqda. Ushbu bo'limda LLM'larni real biznes ilovalariga integratsiya qilish, vektor bazalar va Tool Calling tamoyillari yoritiladi.",
      ru: "Большие языковые модели (LLM) меняют индустрию разработки ПО. Здесь рассматриваются интеграция моделей через API, векторные базы данных и Tool Calling.",
      en: "Large Language Models (LLMs) are transforming software engineering. Learn how to architect robust AI systems using modern tool calling, embeddings, and RAG architectures.",
    },
    keyFeatures: {
      uz: [
        "Google Gemini API va multimodal imkoniyatlar",
        "Function Calling va Tool Integration",
        "Vektor ma'lumotlar bazalari (pgvector, Pinecone)",
        "RAG (Retrieval-Augmented Generation) yondashuvi",
      ],
      ru: [
        "Google Gemini API и мультимодальные модели",
        "Вызов функций (Function Calling) и интеграция с кодом",
        "Векторные базы данных (pgvector)",
        "Архитектура RAG для ответов на основе собственных данных",
      ],
      en: [
        "Google Gemini API and multimodal context processing",
        "Autonomous Tool Calling and structured output generation",
        "Vector databases and semantic embeddings (pgvector)",
        "Enterprise RAG patterns for verified fact grounding",
      ],
    },
    codeSnippet: {
      language: "typescript",
      code: `// Gemini Tool Calling Example
const response = await ai.generate({
  model: "gemini-2.0-flash",
  prompt: "Analyze user churn probability",
  tools: [calculateUserMetricsTool],
});`,
      description: {
        uz: "Gemini API yordamida agentic Tool Calling namunasi",
        ru: "Пример Tool Calling в Gemini API",
        en: "Gemini API agentic Tool Calling implementation",
      },
    },
    faq: {
      uz: [
        {
          question: "RAG (Retrieval-Augmented Generation) nima?",
          answer:
            "RAG — bu til modeliga savol berishdan oldin, kerakli ma'lumotlarni o'zingizning ma'lumotlar bazangizdan qidirib topib, model kontekstiga qo'shib berish usulidir. Bu gallutsinatsiyani yo'qotadi.",
        },
      ],
      ru: [
        {
          question: "Что такое архитектура RAG?",
          answer:
            "RAG позволяет подавать в контекст модели актуальные данные из вашей базы знаний (через векторный поиск), предотвращая галлюцинации.",
        },
      ],
      en: [
        {
          question: "What is Retrieval-Augmented Generation (RAG)?",
          answer:
            "RAG dynamically retrieves relevant context from a knowledge base to augment the LLM prompt, ensuring accurate and up-to-date responses.",
        },
      ],
    },
    relatedSlugs: ["python", "nextjs", "postgresql"],
  },
];

export function getTopicBySlug(slug: string): TopicItem | undefined {
  return TOPICS_DATA.find((topic) => topic.slug === slug);
}
