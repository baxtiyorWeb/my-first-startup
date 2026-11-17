import type { Locale } from "@/lib/i18n/config";

export interface GlossaryItem {
  slug: string;
  term: Record<Locale, string>;
  category: "networking" | "database" | "architecture" | "security" | "devops" | "frontend";
  shortDefinition: Record<Locale, string>;
  detailedExplanation: Record<Locale, string>;
  analogy: Record<Locale, string>;
  codeSnippet?: {
    language: string;
    code: string;
  };
  keyTakeaways: Record<Locale, string[]>;
  relatedSlugs: string[];
}

export const GLOSSARY_DATA: GlossaryItem[] = [
  {
    slug: "rest-api",
    term: {
      uz: "REST API (Representational State Transfer)",
      ru: "REST API (Representational State Transfer)",
      en: "REST API (Representational State Transfer)",
    },
    category: "networking",
    shortDefinition: {
      uz: "Mijoz (frontend) va server o'rtasida standart HTTP metodlari (GET, POST, PUT, DELETE) orqali ma'lumot almashuvchi arxitektura uslubi.",
      ru: "Архитектурный стиль взаимодействия клиента и сервера через стандартные методы протокола HTTP (GET, POST, PUT, DELETE).",
      en: "An architectural style for client-server communication using standard HTTP methods (GET, POST, PUT, DELETE).",
    },
    detailedExplanation: {
      uz: "REST API Roy Fielding tomonidan 2000-yilda taklif qilingan. U holatsiz (stateless) bo'lib, har bir so'rov mustaqil ravishda serverga barcha kerakli ma'lumotlarni yuborishi kerak. JSON formati zamonaviy REST tizimlarida standart hisoblanadi.",
      ru: "REST был сформулирован Роем Филдингом в 2000 году. Ключевой принцип — отсутствие состояния (stateless), при котором сервер не хранит контекст сессии между запросами. Формат JSON является стандартом передачи данных.",
      en: "Formulated by Roy Fielding in 2000, REST relies on a stateless, client-server, cacheable communications protocol. In almost all modern instances, it utilizes JSON over HTTP.",
    },
    analogy: {
      uz: "REST API xuddi restorandagi ofitsiantga o'xshaydi: siz menyudan taom tanlaysiz (GET), ofitsiant buyurtmani oshxonaga (server) olib boradi va sizga tayyor taomni (JSON javob) olib keladi.",
      ru: "REST похож на официанта в ресторане: вы заказываете блюдо из меню (GET), он передает заказ на кухню (сервер) и приносит вам готовое блюдо (JSON-ответ).",
      en: "REST is like a restaurant waiter: you order food from a menu (request), the waiter relays it to the kitchen (server), and brings back the dish (response).",
    },
    codeSnippet: {
      language: "typescript",
      code: `// REST API Endpoint namunasi
// GET /api/v1/posts/42 -> Bitta postni olish
// POST /api/v1/posts   -> Yangi post yaratish
// DELETE /api/v1/posts/42 -> Postni o'chirish

fetch('https://thegogetters.uz/api/topics')
  .then(res => res.json())
  .then(data => console.log(data));`,
    },
    keyTakeaways: {
      uz: [
        "Stateless: Server mijozning oldingi so'rovlarini eslab qolmaydi",
        "HTTP Status kodlari: 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 404 Not Found, 500 Server Error",
        "JSON formati ma'lumot almashish uchun standart",
      ],
      ru: [
        "Stateless: сервер не хранит состояние предыдущих запросов",
        "Стандартные HTTP коды: 200 OK, 201 Created, 404 Not Found, 500 Server Error",
        "JSON — основной формат полезной нагрузки",
      ],
      en: [
        "Stateless: each request contains all context needed for completion",
        "HTTP status codes (200, 201, 400, 401, 404, 500) provide semantic results",
        "Standard JSON payload convention",
      ],
    },
    relatedSlugs: ["jwt", "websockets", "ci-cd"],
  },
  {
    slug: "ci-cd",
    term: {
      uz: "CI/CD (Continuous Integration & Continuous Deployment)",
      ru: "CI/CD (Непрерывная интеграция и доставка)",
      en: "CI/CD (Continuous Integration & Continuous Deployment)",
    },
    category: "devops",
    shortDefinition: {
      uz: "Dasturchilar kodini avtomatik testlash, yig'ish (build) va serverlarga avtomatik joylashtirish (deploy) jarayoni.",
      ru: "Автоматизация тестирования, сборки и развертывания программного обеспечения на боевые сервера.",
      en: "The practice of automating code integration, automated testing, building, and zero-downtime deployment to production.",
    },
    detailedExplanation: {
      uz: "Continuous Integration (CI) har bir git push'dan keyin avtomatik testlarni ishga tushirib, yangi kod avvalgi kodni buzmaganligini tekshiradi. Continuous Deployment (CD) esa tasdiqlangan kodni avtomatik ravishda Vercel, AWS yoki Kubernetes klasteriga joylashtiradi.",
      ru: "Continuous Integration (CI) автоматически прогоняет тесты и линтеры при каждом коммите. Continuous Delivery/Deployment (CD) автоматически разворачивает валидированный код в продакшн.",
      en: "Continuous Integration automates merging code and executing tests. Continuous Deployment ensures verified code is automatically rolled out to staging or production without manual intervention.",
    },
    analogy: {
      uz: "CI/CD avtomobil zavodidagi avtomatlashtirilgan konveyerga o'xshaydi: har bir detal kiritilganda robot uni tekshiradi, bo'yab, tayyor mashinani yo'lga chiqaradi.",
      ru: "CI/CD — это роботизированный конвейер автозавода: детали автоматически проверяются на прочность и без ручного труда собираются в готовый автомобиль.",
      en: "CI/CD is like an automated automotive assembly line where robots stress-test parts and deliver the finished vehicle to the showroom floor.",
    },
    codeSnippet: {
      language: "yaml",
      code: `# .github/workflows/deploy.yml
name: Production CI/CD
on:
  push:
    branches: [main]
jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install
      - run: pnpm run lint
      - run: pnpm run build`,
    },
    keyTakeaways: {
      uz: [
        "Inson omili sababli yuz beradigan xatolarni kamaytiradi",
        "Deploy qilish vaqtini bir necha soatdan bir necha daqiqaga qisqartiradi",
        "Eng mashhur vositalar: GitHub Actions, GitLab CI, ArgoCD",
      ],
      ru: [
        "Исключает человеческий фактор при релизах",
        "Сокращает цикл доставки обновлений до минут",
        "Популярные платформы: GitHub Actions, GitLab CI, Jenkins",
      ],
      en: [
        "Eliminates human error during releases",
        "Reduces deployment cycle time to minutes",
        "Leading tools: GitHub Actions, GitLab CI, ArgoCD",
      ],
    },
    relatedSlugs: ["rest-api", "docker", "jwt"],
  },
  {
    slug: "jwt",
    term: {
      uz: "JWT (JSON Web Token)",
      ru: "JWT (JSON Web Token)",
      en: "JWT (JSON Web Token)",
    },
    category: "security",
    shortDefinition: {
      uz: "Foydalanuvchi shaxsini tasdiqlash uchun ishlatiladigan raqamli imzolangan, ixcham JSON formati.",
      ru: "Компактный и криптографически подписанный формат JSON для безопасной аутентификации пользователей.",
      en: "A compact, URL-safe means of representing claims to be transferred between two parties securely.",
    },
    detailedExplanation: {
      uz: "JWT uch qismdan iborat: Header (algoritm), Payload (foydalanuvchi ID, rollar va muddati), va Signature (maxfiy kalit bilan imzo). Server bu tokenni o'qish uchun ma'lumotlar bazasiga murojaat qilishi shart emas, chunki imzo haqiqiyligini matematik usulda tekshiradi.",
      ru: "JWT состоит из трех частей, разделенных точками: Header (алгоритм), Payload (данные) и Signature (криптографическая подпись). Позволяет реализовать stateless-аутентификацию.",
      en: "A JWT is composed of Header, Payload, and Signature separated by dots. It enables stateless authentication where the backend verifies claims cryptographically without database roundtrips.",
    },
    analogy: {
      uz: "JWT xuddi aeroportdagi samolyot chiptasiga (boarding pass) o'xshaydi: unda sizning ismingiz, o'rindiq raqami va aviakompaniyaning muhri bor. Xodimlar sizni har safar bazadan tekshirmay, chiptadagi muhrga qarab samolyotga qo'yib yuborishadi.",
      ru: "JWT похож на посадочный талон на самолет с печатью: сотрудники аэропорта проверяют штамп и пропускают вас, не делая звонков в базу данных авиакомпании.",
      en: "JWT is like a signed airline boarding pass: it contains your seat, gate, and security stamp, allowing gate agents to verify your access without querying central records.",
    },
    codeSnippet: {
      language: "typescript",
      code: `import { SignJWT, jwtVerify } from "jose";

// Token yaratish (Sign)
const secret = new TextEncoder().encode("secret_key");
const token = await new SignJWT({ userId: "u123", role: "developer" })
  .setProtectedHeader({ alg: "HS256" })
  .setExpirationTime("2h")
  .sign(secret);`,
    },
    keyTakeaways: {
      uz: [
        "3 qism: Header.Payload.Signature",
        "Stateless: Ma'lumotlar bazasiga ortiqcha yuk tushmaydi",
        "Maxfiy ma'lumotlarni (parol, kredit karta) Payload'ga solmaslik kerak, chunki Payload faqat Base64 kodlangan",
      ],
      ru: [
        "Строение: Header.Payload.Signature",
        "Stateless: снимает нагрузку с базы данных сессий",
        "Никогда не храните конфиденциальные данные (пароли) в Payload",
      ],
      en: [
        "Structure: Header.Payload.Signature",
        "Enables true stateless scalability",
        "Never store sensitive data (passwords) in Payload (it is only Base64-encoded)",
      ],
    },
    relatedSlugs: ["rest-api", "microservices"],
  },
  {
    slug: "microservices",
    term: {
      uz: "Microservices (Mikroservislar Arxitekturasi)",
      ru: "Микросервисная архитектура (Microservices)",
      en: "Microservices Architecture",
    },
    category: "architecture",
    shortDefinition: {
      uz: "Katta dasturni mustaqil, alohida ishlab chiqiladigan va tarqatiladigan kichik servislar to'plami ko'rinishida qurish uslubi.",
      ru: "Подход к разработке ПО, при котором система строится из набора независимых, слабо связанных небольших сервисов.",
      en: "An architectural style structuring an application as a collection of small, independently deployable services.",
    },
    detailedExplanation: {
      uz: "Monolit ilovalarda butun tizim bitta kod bazasida bo'ladi. Mikroservislarda esa to'lovlar, foydalanuvchilar, bildirishnomalar alohida serverlarda mustaqil ishlaydi va o'zaro HTTP yoki gRPC/RabbitMQ orqali gaplashadi.",
      ru: "В отличие от монолита, где весь код развернут единым блоком, микросервисы разделяют функционал (биллинг, auth, уведомления) на автономные сервисы со своими базами данных.",
      en: "Unlike monoliths where all modules share memory and databases, microservices decouple business capabilities into autonomous services communicating over lightweight protocols (HTTP/gRPC/Kafka).",
    },
    analogy: {
      uz: "Monolit — bitta katta shveytsariya pichog'i. Mikroservislar esa maxsus professional ustaxonadagi har bir ish uchun alohida asboblar to'plami.",
      ru: "Монолит — это универсальный швейцарский нож. Микросервисы — специализированный набор профессиональных инструментов в мастерской.",
      en: "A monolith is a Swiss Army knife. Microservices are specialized toolsets in a modern workshop, each engineered for optimal execution.",
    },
    codeSnippet: {
      language: "typescript",
      code: `// Mikroservislar aro gRPC yoki Event-driven xabar
await rabbitmq.publish("order_created", {
  orderId: "ord_99",
  amount: 450,
  timestamp: Date.now(),
});`,
    },
    keyTakeaways: {
      uz: [
        "Har bir servis o'z ma'lumotlar bazasiga ega bo'lishi kerak",
        "Katta jamoalarda mustaqil ishlash imkonini beradi",
        "Kamchiligi: Tarmoq kechikishlari va murakkab monitoring (OpenTelemetry)",
      ],
      ru: [
        "Каждый сервис владеет собственной базой данных",
        "Позволяет параллельно работать десяткам команд",
        "Минусы: сложность мониторинга и распределенные транзакции",
      ],
      en: [
        "Database-per-service pattern is essential",
        "Empowers autonomous engineering teams to scale",
        "Trade-offs: network latency, distributed tracing, and eventual consistency",
      ],
    },
    relatedSlugs: ["rest-api", "docker", "ci-cd"],
  },
  {
    slug: "orm",
    term: {
      uz: "ORM (Object-Relational Mapping)",
      ru: "ORM (Object-Relational Mapping)",
      en: "ORM (Object-Relational Mapping)",
    },
    category: "database",
    shortDefinition: {
      uz: "Ma'lumotlar bazasi jadvallarini dasturlash tilidagi obyektlar va turlar bilan bog'lovchi vosita (Drizzle, Prisma).",
      ru: "Технология связывания реляционных таблиц базы данных с объектами в коде приложения (Drizzle, Prisma).",
      en: "A programming technique for converting data between relational databases and object-oriented domain models.",
    },
    detailedExplanation: {
      uz: "Dasturchilar to'g'ridan-to'g'ri xom SQL yozish o'rniga, TypeScript yoki Python obyektlari orqali ma'lumotlar bilan xavfsiz va tiplangan holda ishlaydilar. Drizzle ORM eng tez va xavfsiz zamonaviy TypeScript ORM hisoblanadi.",
      ru: "Вместо написания сырого SQL кода, разработчики работают с типизированными моделями. Drizzle ORM и Prisma обеспечивают безопасность типов и автогенерацию миграций.",
      en: "Rather than writing raw SQL strings, ORMs allow developers to interact with database records via type-safe abstractions. Drizzle ORM provides zero-overhead SQL generation with full TypeScript safety.",
    },
    analogy: {
      uz: "ORM — bu SQL tili va TypeScript tili o'rtasidagi professional tarjimon. Siz o'z tilingizda gapirasiz, u bazaga mos SQL tiliga tarjima qilib beradi.",
      ru: "ORM — это дипломатический переводчик между миром реляционных таблиц SQL и миром объектов TypeScript.",
      en: "An ORM acts as a fluent translator bridging relational SQL tables and object-oriented TypeScript constructs.",
    },
    codeSnippet: {
      language: "typescript",
      code: `// Drizzle ORM misoli
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";

const user = await db
  .select()
  .from(users)
  .where(eq(users.handle, "tech_lead"))
  .limit(1);`,
    },
    keyTakeaways: {
      uz: [
        "SQL injection xavfidan avtomatik himoya qiladi",
        "Type-safety: Kompilyatsiya vaqtida ustun nomlaridagi xatolarni ko'rsatadi",
        "Migratsiyalarni osonlashtiradi",
      ],
      ru: [
        "Встроенная защита от SQL-инъекций",
        "Полная типобезопасность на этапе написания кода",
        "Упрощенное управление миграциями базы данных",
      ],
      en: [
        "Inherent protection against SQL injection vulnerabilities",
        "End-to-end compile-time type safety across schema and queries",
        "Structured schema migrations",
      ],
    },
    relatedSlugs: ["postgresql", "typescript", "rest-api"],
  },
  {
    slug: "websockets",
    term: {
      uz: "WebSockets (Real-time Ikki Tomonlama Aloqa)",
      ru: "WebSockets (Полнодуплексная связь в реальном времени)",
      en: "WebSockets (Full-Duplex Real-Time Communication)",
    },
    category: "networking",
    shortDefinition: {
      uz: "Mijoz va server o'rtasida bitta TCP ulanishi orqali doimiy, tezkor va ikki tomonlama ma'lumot uzatish protokoli.",
      ru: "Протокол постоянного двустороннего соединения между клиентом и сервером через единый TCP-сокет.",
      en: "A computer communications protocol providing full-duplex communication channels over a single TCP connection.",
    },
    detailedExplanation: {
      uz: "Oddiy HTTP so'rovida mijoz har safar so'rov yuborishi va server javobini kutishi kerak. WebSocket esa bitta ulanishni ochiq saqlaydi va chatlar, live narxlar, bildirishnomalarni millisoniyalarda yetkazadi.",
      ru: "В HTTP клиент каждый раз инициирует новый запрос. WebSocket устанавливает долгоживущее соединение, позволяя серверу мгновенно отправлять пуш-данные клиенту (чаты, котировки).",
      en: "Unlike HTTP request-response cycles, WebSockets keep an open socket channel, allowing the server to push updates instantly without polling overhead.",
    },
    analogy: {
      uz: "HTTP — xat yozishib kutishga o'xshaydi. WebSocket esa to'g'ridan-to'g'ri telefon qo'ng'irog'i orqali uzluksiz gaplashishdir.",
      ru: "HTTP похож на отправку бумажных писем, а WebSocket — на прямой телефонный разговор.",
      en: "HTTP is like sending letters back and forth; WebSockets is an open telephone line where both parties can talk continuously.",
    },
    codeSnippet: {
      language: "typescript",
      code: `const socket = new WebSocket("wss://thegogetters.uz/api/messages/stream");

socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log("Yangi xabar:", message);
};`,
    },
    keyTakeaways: {
      uz: [
        "Chatlar, onlayn o'yinlar va birjalar uchun ideal",
        "Kichik header overhead (bor-yo'g'i 2 bayt)",
        "Fallback sifatida Server-Sent Events (SSE) ham ishlatiladi",
      ],
      ru: [
        "Идеально для мессенджеров, биржевых котировок и совместных редакторов",
        "Минимальный оверхед сетевых заголовков",
        "Альтернатива для однонаправленных данных — SSE (Server-Sent Events)",
      ],
      en: [
        "Essential for instant messaging, collaborative canvas, and financial tickers",
        "Ultra-low latency frame overhead (2-10 bytes)",
        "Complementary to Server-Sent Events (SSE) for unidirectional streams",
      ],
    },
    relatedSlugs: ["rest-api", "jwt"],
  },
];

export function getGlossaryBySlug(slug: string): GlossaryItem | undefined {
  return GLOSSARY_DATA.find((item) => item.slug === slug);
}
