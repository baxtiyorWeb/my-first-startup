# THE GO-GETTERS (FIKR) — WEB FEATURE INVENTORY & AUDIT MATRIX

> **Hujjat turi:** Texnik Inventarizatsiya va Holat Matritsasi  
> **Loyiha:** The Go-getters Web Platform (`my-first-startup`)  
> **Versiya:** 1.0.0 (Pre-Mobile / Pre-Admin Monorepo Split)  
> **Sana:** 2026-10-14  
> **Mas'ul:** CTO & Principal Software Architect  

---

## 1. LOYIHA HAQIDA UMUMIY MA'LUMOT

**The Go-getters** — intiluvchan insonlar, dasturchilar, startapchilar va mutaxassislar uchun ixtisoslashgan innovatsion ijtimoiy va professional platforma.  
Mavjud web ilova quyidagi texnologiyalar asosida ishlaydi:
- **Framework:** Next.js 16.3.5 (App Router, Turbopack)
- **UI & Runtime:** React 19.2.8, Tailwind CSS v4, Lucide React
- **Ma'lumotlar bazasi:** Neon Serverless PostgreSQL (Drizzle ORM 0.45.2)
- **Autentifikatsiya:** JWT Sessiya tokenlari (`jose` 6.2.12), HttpOnly cookie + Bearer token arxitekturasi, Google OAuth 2.0
- **Media & CDN:** Bunny.net Storage & CDN Zone (`local-network.b-cdn.net`)
- **Real-time:** Server-Sent Events (SSE) `/api/messages/stream` orqali xabarlar va typing indicator
- **Push bildirishnomalar:** OneSignal Web Push SDK
- **Sun'iy Intellekt / Botlar:** Google Gemini API (`@google/genai`) va OpenRouter bot agregatori
- **Ko'p tillilik (i18n):** O'zbekcha (`uz`), Ruscha (`ru`), Inglizcha (`en`)

---

## 2. WEB SAHIFA VA FUNKSIYALARNING TO'LIQ INVENTARIZATSIYASI

| # | Modul / Sahifa | URL / Route | Asosiy UI Komponentlar | Backend Endpoint / Service | Ma'lumotlar Modeli (DB) | Auth & Ruxsatlar | Loading, Empty, Error Holatlari | Mobile Holati | Admin Boshqaruvi | Testlar |
|---|---|---|---|---|---|---|---|---|---|---|
| **01** | **Landing Page** | `/[locale]/` | `GoGettersLanding`, `Header`, `LanguageSwitcher`, `ThemeToggle`, `Footer` | `GET /api/auth/session` | N/A (Statik + sessiya holati) | Ochiq (Guest) | Hero skeleton, CTA button spinners | Rejalashtirilgan (Onboarding/Welcome screen) | Yo'q (Statik kontent) | Smoke test |
| **02** | **Tizimga kirish (Login)** | `/[locale]/auth/login` | `AuthForm (mode="login")`, Google OAuth Button, `LanguageSwitcher` | `GET /api/auth/google`, `GET /api/auth/google/callback` | `users`, `user_sessions` | Ochiq (Guest faqat) | OAuth redirect spinner, xato banneri (alert) | Rejalashtirilgan (Google Sign-In + Token Auth) | Sessiyalar boshqaruvi | OAuth flow test |
| **03** | **Ro'yxatdan o'tish (Register)** | `/[locale]/auth/register` | `AuthForm (mode="register")`, Google OAuth Button | `GET /api/auth/google`, `GET /api/auth/google/callback` | `users`, `user_sessions` | Ochiq (Guest faqat) | OAuth redirect spinner, xatolik ko'rsatish | Rejalashtirilgan (Mobile Register flow) | Yangi user moderatsiyasi | OAuth flow test |
| **04** | **Onboarding (Profil yaratish)** | `/[locale]/onboarding` | Handle input, Role picker, Bio textarea, Avatar generator, Submit button | `POST /api/auth/onboarding` | `users` (`isOnboarded`, `handle`, `name`, `role`, `bio`) | Majburiy (Faqat `isOnboarded=false` userlar) | Loading button, handle bandlik xatosi, validatsiya | Rejalashtirilgan (Multi-step wizard) | User profilini tahrirlash | E2E handle uniqueness test |
| **05** | **Asosiy Lenta (Feed)** | `/[locale]/dashboard` | `FeedContainer`, `PostCard`, Filter Tabs (`thought`/`project`), Infinite Scroll, `DiscussionDrawer` | `GET /api/posts?cursor=&limit=&type=` | `posts`, `users`, `post_likes`, `bookmarks` | Ixtiyoriy (Guest ko'ra oladi, interaksiya uchun Auth) | PostCardSkeleton, Bo'sh feed xabari, Qayta urinish (Retry) tugmasi | Rejalashtirilgan (Virtualizatsiyalangan FlatList + Pull-to-refresh) | Postlarni o'chirish, tahrirlash | Feed API integration test |
| **06** | **Post yaratish** | `/[locale]/dashboard/create` | Post type switch (`thought`/`project`), Rich text editor, Media yuklovchi, Form actions | `POST /api/posts`, `POST /api/upload` | `posts`, Bunny CDN | Majburiy (Auth user) | Yuklash progressi, media upload skeleton, validation error | Rejalashtirilgan (Native image picker + Bunny API) | Noqonuniy postlarni o'chirish | Validation & Rate-limit test |
| **07** | **Post tafsilotlari (Detail)** | `/[locale]/dashboard/posts/[id]` | `PostDetailClient`, `RichContent`, Like/Bookmark action, Nested Comment Tree, Report Modal | `GET /api/posts/[id]`, `POST /api/posts/[id]/view`, `GET /api/posts/[id]/comments` | `posts`, `comments`, `comment_likes`, `post_views` | Ixtiyoriy (Guest o'qiy oladi) | Sahifa skeleton, izohlar bo'sh holati, 404 xatosi | Rejalashtirilgan (KeyboardAvoidingView + Nested replies) | Post va izohlarni moderatsiya qilish | Deduplicated view test, comment hierarchy test |
| **08** | **Izohlar va Munozaralar** | `DiscussionDrawer` (Modal/Drawer) | Izoh yozish formasi, nested javoblar (replies), comment like tugmasi | `POST /api/posts/[id]/comments`, `POST /api/comments/[id]/like` | `comments`, `comment_likes`, `notifications` | Majburiy (Auth user) | Comment skeleton, bo'sh izohlar indikatori, optimistik yangilanish | Rejalashtirilgan (Bottom Sheet modal + replies tree) | Izohni o'chirish | Nested comments test |
| **09** | **Reels / Qisqa fikrlar** | `/[locale]/dashboard/reels` | Vertikal snap-scroll, author badge, like/share actions, quick comment trigger | `GET /api/posts?type=thought` | `posts`, `users` | Ixtiyoriy | Full-screen video/card skeleton, bo'sh lenta | Rejalashtirilgan (Reanimated + PagerView / FlatList) | Lenta filtrlash | Reel scrolling test |
| **10** | **Explore / Kashf qilish** | `/[locale]/dashboard/explore` | Tavsiya qilingan foydalanuvchilar, Trend mavzular, Saralangan loyihalar | `GET /api/users/recommended`, `GET /api/posts?type=project` | `users`, `posts`, `follows` | Ixtiyoriy | Gorizontal user kartochkalari skeletoni, empty state | Rejalashtirilgan (SectionList + Discover feeds) | Bot va loyiha tavsiyalarini boshqarish | Recommended algorithm test |
| **11** | **Xabarlar (Direct Messages)** | `/[locale]/dashboard/messages` | Suhbatlar ro'yxati, Chat dialog darchasi, Xabar yozish, Typing indicator, Unread badge | `GET /api/messages/conversations`, `GET /api/messages/conversations/[id]/messages`, `POST /api/messages/conversations/[id]/messages`, `GET /api/messages/stream` (SSE) | `conversations`, `conversation_participants`, `messages` | Majburiy (Auth user, DM ruxsat tekshiruvi) | Chat skeleton, xabarlar bo'shligi, tarmoq uzilishi qayta ulanishi | Rejalashtirilgan (GiftedChat / custom SSE client + SQLite cache) | Noqonuniy xabarlar shikoyatlari | Deterministic pairKey va Idempotency test (Passed) |
| **12** | **Bildirishnomalar** | `/[locale]/dashboard/notifications` | `NotificationBell`, Bildirishnomalar ro'yxati, Barchasini o'qilgan deb belgilash, Filtrlash | `GET /api/notifications`, `POST /api/notifications/read`, `GET /api/notifications/unread-count` | `notifications`, `users` | Majburiy (Auth user) | Notification list skeleton, bo'sh xabar qutisi | Rejalashtirilgan (Native Push + Deep link router) | Push xabarnoma yuborish | Unread count & aggregation test |
| **13** | **Saqlanganlar (Bookmarks)** | `/[locale]/dashboard/bookmarks` | Saqlangan postlar ro'yxati, saqlashdan chiqarish, filtrlash | `GET /api/bookmarks`, `POST /api/posts/[id]/bookmark` | `bookmarks`, `posts` | Majburiy (Auth user) | Saqlanganlar skeleton, bo'sh bookmarklar holati | Rejalashtirilgan (Offline saved posts) | N/A (Shaxsiy ma'lumot) | Bookmark toggle test |
| **14** | **Foydalanuvchi Profili** | `/[locale]/dashboard/profile` va `/[locale]/dashboard/users/[handle]` | `ProfileHeader`, Cover rasmi, Avatar, Bio, Follow/Unfollow, Postlar/Loyihalar tablari | `GET /api/users/[handle]`, `POST /api/users/[handle]/follow`, `GET /api/posts` | `users`, `follows`, `posts` | Ixtiyoriy (O'z profilingiz uchun Auth) | Profil banneri skeleton, postlar bo'shligi, 404 user | Rejalashtirilgan (Parallax header + Native Tabs) | Foydalanuvchini bloklash/ban | Follow counters va anti-self-follow test |
| **15** | **Profilni tahrirlash** | `ProfileEditModal` | Ism, Kasb, Bio, Ijtimoiy tarmoqlar (Github, Linkedin, Twitter), Avatar/Cover yuklash | `PATCH /api/settings/account`, `POST /api/upload` | `users` | Majburiy (O'z profilingiz) | Saqlash spinneri, validation errorlari | Rejalashtirilgan (Native image crop & form) | User ma'lumotlarini tozalash | Account update validation test |
| **16** | **Qidiruv** | `/[locale]/dashboard/search` va `SearchModal` | Qidiruv maydoni, Foydalanuvchilar natijalari, Postlar natijalari, Tarix | `GET /api/search?q=&type=` | `users`, `posts` (PostgreSQL ILIKE & full-text) | Ixtiyoriy | Qidiruv spinneri, Hech narsa topilmadi (Empty) | Rejalashtirilgan (Debounced search bar) | Qidiruv trendlarini ko'rish | Search query test |
| **17** | **Sozlamalar (Settings)** | `/[locale]/dashboard/settings` | Hisob ma'lumotlari, Parol o'zgartirish, Seanslar tarixi, Bildirishnoma sozlamalari, Bloklanganlar, Ma'lumotlarni eksport qilish, Hisobni o'chirish | `GET/PATCH /api/settings/*`, `DELETE /api/settings/sessions`, `GET /api/settings/export` | `users`, `user_sessions`, `notification_settings`, `user_blocks` | Majburiy (Auth user) | Yuklanish holatlari, muvaffaqiyat toastlari, tasdiqlash dialogi | Rejalashtirilgan (Native Settings screens) | Tizim konfiguratsiyasi | Session revoke va Account delete test |
| **18** | **In-App Admin Dashboard** | `/[locale]/dashboard/admin` | Statistika paneli, Foydalanuvchilar jadvali, Postlar moderatsiyasi, AI Bot Engine kontrolleri | `GET /api/admin/overview`, `GET /api/admin/users`, `GET /api/admin/posts`, `POST /api/admin/bots/action` | `users`, `posts`, `comments`, `bot_activities`, `bot_engine_settings` | Faqat Admin (`ADMIN`, `SUPER_ADMIN` yoki `ADMIN_EMAILS`) | Admin guard 401/403/404, Stats skeletons | Alohida `admin/` Next.js loyihasiga ajratiladi | To'liq boshqaruv markazi | RBAC enforcement test |
| **19** | **Huquqiy sahifalar (Legal)** | `/[locale]/terms`, `/privacy`, `/guidelines`, `/help` | Markdown/HTML matnlar, Bo'limlararo navigatsiya, i18n | Statik kontent | N/A | Ochiq | Statik tezkor yuklanish | Rejalashtirilgan (In-app Webview yoki Native Markdown) | Shartlarni yangilash | Smoke test |

---

## 3. AUDIT XULOSASI VA ANIQLANGAN XATARLAR

1. **Server Actions vs REST API:**  
   Mavjud loyiha baxtimizga to'liq RESTful API Route Handlers (`app/api/*`) asosida qurilgan! Server Actions bilan qattiq bog'lanish yo'q. Bu mobil ilova va mustaqil admin paneli uchun katta arxitekturaviy ustunlik.
2. **Autentifikatsiya uzluksizligi:**  
   Hozirgi `requireAuth` va `getOptionalAuth` yordamchi funksiyalari HTTP `Authorization: Bearer <token>` sarlavhasini qo'llab-quvvatlaydi. Web HttpOnly cookie ishlatsa, Mobile ilova SecureStore'da saqlangan JWT tokenni Bearer sarlavhasi orqali yuborishi mumkin.
3. **Google Sign-In Mobile cheklovi:**  
   Webda Google OAuth `redirect` mexanizmi orqali ishlaydi. React Native mobil ilovasida Google Sign-In SDK yoki Expo AuthSession orqali `id_token` olinishi va backendga `POST /api/auth/google/mobile` orqali yuborilishi kerak.
4. **Mustaqil Admin Panel zarurati:**  
   Hozirgi `app/[locale]/dashboard/admin/page.tsx` 1667 qatorli bitta ulkan fayl bo'lib, web litsenziyasiga qo'shilib ketgan. Uni alohida `admin/` mustaqil loyihasiga to'liq professional modullar sifatida ajratish xavfsizlik va barqarorlikni kafolatlaydi.
