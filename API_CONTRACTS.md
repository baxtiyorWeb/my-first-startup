# THE GO-GETTERS (FIKR) — EXHAUSTIVE REST API CONTRACTS SPECIFICATION

> **Hujjat turi:** Texnik API Shartnomalari (API Contracts Specification)  
> **Loyiha:** The Go-getters Web, Mobile & Admin Ekotizimi  
> **Versiya:** 1.0.0  
> **Protokol:** HTTP/1.1 & HTTP/2 over TLS (HTTPS)  
> **Asosiy URL:** `https://api.thegogetters.uz/api` yoki `http://localhost:3000/api`  
> **Autentifikatsiya:** `Authorization: Bearer <JWT>` (Mobile/Admin) yoki `Cookie: gogetters_session=<JWT>` (Web)  

---

## 1. UMUMIY FORMAT VA XATOLIKLAR STRUKTURASI

### 1.1. Muvaffaqiyatli javob formati (`ApiSuccessResponse<T>`)
Barcha muvaffaqiyatli API so'rovlari 2xx HTTP status kodi bilan quyidagi JSON ko'rinishida qaytadi:
```typescript
interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    total?: number;
    cursor?: string | null;
    nextCursor?: string | null;
    unreadCount?: number;
    hasMore?: boolean;
  };
}
```

### 1.2. Standart Xatolik formati (`ApiErrorResponse`)
Barcha 4xx va 5xx xatoliklar qat'iy tuzilmada qaytadi:
```typescript
interface ApiErrorResponse {
  success: false;
  error: {
    code: string; // Masalan: "UNAUTHORIZED", "VALIDATION_ERROR", "RATE_LIMITED", "NOT_FOUND"
    message: string; // Foydalanuvchiga tushunarli xabar
    details?: Array<{
      field: string;
      issue: string;
    }>;
  };
}
```

### 1.3. Standart HTTP Status Kodlari
- `200 OK`: So'rov muvaffaqiyatli bajarildi
- `201 Created`: Yangi resurs yaratildi (masalan, yangi post yoki izoh)
- `400 Bad Request`: Validatsiya xatosi yoki parametrlar yetishmaydi
- `401 Unauthorized`: Sessiya eskirgan, token yo'q yoki noto'g'ri
- `403 Forbidden`: Ruxsat yo'q (masalan, bloklangan foydalanuvchi yoki begona resursni o'chirish)
- `404 Not Found`: Resurs topilmadi
- `409 Conflict`: Unikal cheklov buzildi (masalan, `@handle` allaqachon band)
- `429 Too Many Requests`: Rate limit chegarasi oshib ketdi
- `500 Internal Server Error`: Kutilmagan server xatoligi

---

## 2. AUTENTIFIKATSIYA VA SESSIYA MODULI (AUTH)

### 2.1. `GET /api/auth/session`
Joriy foydalanuvchi sessiya holatini va to'liq profilini qaytaradi.

- **Method:** `GET`
- **Auth:** Ixtiyoriy (Optional Auth)
- **Headers:** `Authorization: Bearer <token>` yoki Cookie
- **Query / Body:** Yo'q
- **Response 200 (Autentifikatsiyadan o'tgan):**
  ```json
  {
    "success": true,
    "data": {
      "isAuthenticated": true,
      "isOnboarded": true,
      "user": {
        "id": "6a33deb7-aad8-43df-84ab-51f4a09c47b9",
        "name": "Sardor Rahimov",
        "handle": "sardor_rahimov",
        "email": "sardor@example.com",
        "phone": "+998901234567",
        "role": "Full-Stack Dasturchi",
        "bio": "Dasturchi va startap yaratuvchisi",
        "avatarUrl": "https://local-network.b-cdn.net/avatars/user.jpg",
        "coverPhotoUrl": null,
        "verified": true,
        "isOnboarded": true,
        "isBot": false,
        "theme": "system",
        "stats": {
          "postsCount": 12,
          "followersCount": 45,
          "followingCount": 28
        }
      }
    }
  }
  ```
- **Response 200 (Guest / Mehmon):**
  ```json
  {
    "success": true,
    "data": {
      "isAuthenticated": false,
      "isOnboarded": false,
      "user": null
    }
  }
  ```

---

### 2.2. `POST /api/auth/google/verify` (Mobil & API Uchun)
Google Sign-In SDK orqali olingan `id_token` yoki Google ma'lumotlarini tekshirib, sessiya tokeni (JWT) qaytaradi.

- **Method:** `POST`
- **Auth:** Ochiq (Guest)
- **Request Body:**
  ```json
  {
    "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6...",
    "deviceName": "Google Pixel 8 Pro",
    "platform": "android"
  }
  ```
- **Validatsiya:** `idToken` mavjud va Google OAuth certlari orqali yaroqli bo'lishi shart.
- **Response 200 (Success):**
  ```json
  {
    "success": true,
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "userId": "6a33deb7-aad8-43df-84ab-51f4a09c47b9",
        "handle": "@sardor_rahimov",
        "name": "Sardor Rahimov",
        "role": "Go-getter",
        "avatarUrl": "https://lh3.googleusercontent.com/...",
        "isOnboarded": true,
        "sessionId": "a90823b1-..."
      }
    }
  }
  ```

---

### 2.3. `POST /api/auth/onboarding`
Yangi ro'yxatdan o'tgan foydalanuvchining ilk profil ma'lumotlarini saqlaydi va `isOnboarded=true` qiladi.

- **Method:** `POST`
- **Auth:** Majburiy (`requireAuth`)
- **Request Body:**
  ```json
  {
    "name": "Alisher Qodirov",
    "handle": "@alisher_q",
    "role": "Senior Frontend Engineer",
    "bio": "UX va mobil ekotizimlar haqida yozaman"
  }
  ```
- **Validatsiya Qoidalari (Zod):**
  - `name`: string, min 2, max 100 ta belgi.
  - `handle`: string, format: `/^@[a-zA-Z0-9_]{3,30}$/`
  - `role`: string, min 2, max 100 ta belgi.
  - `bio`: string, optional, max 500 ta belgi.
- **Xatolik 409 Conflict:** `@handle` boshqa foydalanuvchi tomonidan band bo'lsa:
  ```json
  {
    "success": false,
    "error": {
      "code": "HANDLE_TAKEN",
      "message": "Ushbu @handle allaqachon band. Boshqa nom tanlang"
    }
  }
  ```

---

### 2.4. `POST /api/auth/logout`
Joriy qurilma seansini yopadi va JWT cookie/tokenni bekor qiladi.

- **Method:** `POST`
- **Auth:** Majburiy yoki Ixtiyoriy
- **Response 200:**
  ```json
  {
    "success": true,
    "data": { "message": "Muvaffaqiyatli chiqildi" }
  }
  ```

---

## 3. POSTLAR VA LENTA MODULI (POSTS)

### 3.1. `GET /api/posts`
Lenta postlarini vaqt kursori (`cursor`) va sahifalar bo'yicha oladi.

- **Method:** `GET`
- **Auth:** Ixtiyoriy (`getOptionalAuth`)
- **Query Parametrlari:**
  - `cursor` (string, optional): oldingi sahifaning oxirgi posti `createdAt` ISO stringi.
  - `limit` (integer, default: 20, max: 50): sahifadagi postlar soni.
  - `type` (string, optional): `"thought"` yoki `"project"`.
- **Response 200 (Success):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "280562bc-f786-4276-a342-864cc04f5b78",
        "title": "Kod arxitekturasida soddalik: Full-Stack Dasturchi nigohi",
        "content": "<p>Dasturchi va muhandislar uchun eng muhim...</p>",
        "postType": "thought",
        "projectUrl": null,
        "projectStage": null,
        "lookingFor": null,
        "mediaUrls": ["https://local-network.b-cdn.net/posts/img1.webp"],
        "readingTimeMinutes": 2,
        "likesCount": 15,
        "commentsCount": 4,
        "sharesCount": 2,
        "viewsCount": 142,
        "createdAt": "2026-10-14T06:00:00.000Z",
        "isLiked": false,
        "isSaved": true,
        "author": {
          "id": "6a33deb7-aad8-43df-84ab-51f4a09c47b9",
          "name": "Sardor Rahimov",
          "handle": "sardor_rahimov",
          "role": "Full-Stack Dasturchi",
          "avatarUrl": "https://api.dicebear.com/7.x/micah/svg?seed=sardor_dev",
          "verified": true,
          "intent": "none",
          "isFollowing": false
        }
      }
    ],
    "meta": {
      "nextCursor": "2026-10-14T05:30:00.000Z"
    }
  }
  ```

---

### 3.2. `POST /api/posts`
Yangi fikr yoki startap loyihasi postini yaratadi.

- **Method:** `POST`
- **Auth:** Majburiy (`requireAuth`)
- **Rate Limit:** 10 minutda 10 ta post (`create_post:${userId}`)
- **Request Body:**
  ```json
  {
    "title": "Startap arxitekturasi: MVP bosqichida xatolar",
    "content": "MVP qurishda eng katta xato bu masshtab haqida haddan tashqari ko'p bosh qotirish...",
    "postType": "thought",
    "projectUrl": "https://myproject.uz",
    "projectStage": "mvp",
    "lookingFor": "feedback",
    "mediaUrls": ["https://local-network.b-cdn.net/uploads/image1.jpg"]
  }
  ```
- **Validatsiya:**
  - `content`: min 5 ta belgi, XSS tozalovchi (`sanitizeHtml`) orqali xavfsiz holatga keltiriladi.
  - `postType`: `"thought"` yoki `"project"`.
  - `mediaUrls`: max 3 ta haqiqiy URL.
- **Response 201 Created:** Yangi yaratilgan Post obyekti.

---

### 3.3. `GET /api/posts/[id]`
Bitta postning to'liq ma'lumotlarini oladi.

- **Method:** `GET`
- **Path Param:** `id` (UUID)
- **Response 200:** Post obyekti.
- **Response 404:** Post topilmasa yoki o'chirilgan bo'lsa.

---

### 3.4. `POST /api/posts/[id]/like`
Postga like bosish yoki likeni qaytarib olish (toggle).

- **Method:** `POST`
- **Auth:** Majburiy
- **Response 200:**
  ```json
  {
    "success": true,
    "data": {
      "isLiked": true,
      "likesCount": 16
    }
  }
  ```

---

### 3.5. `POST /api/posts/[id]/bookmark`
Postni saqlash yoki saqlanganlardan chiqarish (toggle).

- **Method:** `POST`
- **Auth:** Majburiy
- **Response 200:**
  ```json
  {
    "success": true,
    "data": {
      "isSaved": true
    }
  }
  ```

---

### 3.6. `POST /api/posts/[id]/view`
Post ko'rishlar sonini oshirish (1 soatlik deduplikatsiya).

- **Method:** `POST`
- **Auth:** Ixtiyoriy (Guest IP/User-Agent yoki User UUID orqali)
- **Response 200:** `{ "success": true, "data": { "viewsCount": 143 } }`

---

## 4. IZOXLAR VA MUNOZARALAR (COMMENTS)

### 4.1. `GET /api/posts/[id]/comments`
Postning daraxtsimon (nested) izohlari va javoblarini oladi.

- **Method:** `GET`
- **Response 200:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "c1a2b3c4-...",
        "postId": "280562bc-...",
        "parentId": null,
        "content": "Juda dolzarb mavzu, to'liq qo'shilaman!",
        "likesCount": 3,
        "isLiked": false,
        "createdAt": "2026-10-14T07:15:00.000Z",
        "author": {
          "id": "user-uuid",
          "name": "Botir Ziyatov",
          "handle": "bziyatov",
          "avatarUrl": "https://...",
          "verified": true
        },
        "replies": [
          {
            "id": "reply-uuid",
            "postId": "280562bc-...",
            "parentId": "c1a2b3c4-...",
            "content": "Aynan qaysi qismi ko'proq ma'qul keldi?",
            "likesCount": 1,
            "isLiked": false,
            "createdAt": "2026-10-14T07:20:00.000Z",
            "author": { ... }
          }
        ]
      }
    ]
  }
  ```

---

### 4.2. `POST /api/posts/[id]/comments`
Yangi izoh yoki mavjud izohga javob (`parentId`) yozish.

- **Method:** `POST`
- **Auth:** Majburiy
- **Request Body:**
  ```json
  {
    "content": "Fikringizga qo'shilaman...",
    "parentId": "c1a2b3c4-..." // Ixtiyoriy, agar javob bo'lsa
  }
  ```
- **Response 201 Created:** Yangi yaratilgan izoh obyekti.

---

## 5. XABARLAR VA REAL-TIME CHAT (MESSAGES)

### 5.1. `GET /api/messages/conversations`
Foydalanuvchining barcha shaxsiy suhbatlari ro'yxatini oladi.

- **Method:** `GET`
- **Auth:** Majburiy
- **Response 200:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "7db3aab4-deeb-42be-ac5d-8a141e4cae8c",
        "lastMessageText": "Ertaga soat 10:00 da gaplashamizmi?",
        "lastMessageAt": "2026-10-14T08:00:00.000Z",
        "unreadCount": 2,
        "peer": {
          "id": "8d34bcf4-6bea-46b1-9155-28e7ccc42baa",
          "name": "Azizbek Yoqubov",
          "handle": "azizbek_yoqubov",
          "avatarUrl": "https://...",
          "showOnlineStatus": true,
          "dmPermission": "everyone"
        }
      }
    ]
  }
  ```

---

### 5.2. `POST /api/messages/conversations/[id]/messages`
Suhbatga yangi xabar yuborish (Idempotent).

- **Method:** `POST`
- **Auth:** Majburiy
- **Request Body:**
  ```json
  {
    "content": "Salom, loyiha holati qanday?",
    "clientMessageId": "client-uuid-12345",
    "mediaUrls": []
  }
  ```
- **Idempotency Kafolati:** `(conversation_id, sender_id, client_message_id)` unikal indeks orqali tarmoq qayta urinishlarida dublikat xabarlar tushishi oldi olinadi.
- **Response 201 Created:** Yaratilgan xabar obyekti.

---

### 5.3. `GET /api/messages/stream` (Server-Sent Events)
Real-time yangi xabarlar, o'qilganlik belgilari va typing ko'rsatkichlarini qabul qiluvchi oqim.

- **Method:** `GET`
- **Auth:** Majburiy (Bearer token yoki Cookie)
- **Headers:** `Accept: text/event-stream`, `Cache-Control: no-cache`
- **Event turlari:**
  - `message`: Yangi kelgan xabar payload
  - `read`: Suhbatdosh xabarni o'qiganligi
  - `typing`: Suhbatdosh xabar yozayotganligi

---

## 6. BILDIRISHNOMALAR (NOTIFICATIONS)

### 6.1. `GET /api/notifications`
Foydalanuvchining bildirishnomalari ro'yxatini qaytaradi.

- **Method:** `GET`
- **Auth:** Majburiy
- **Response 200:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "notif-uuid",
        "type": "like",
        "title": "Yangi like",
        "message": "Alisher Qodirov sizning postingizga like bosdi",
        "link": "/dashboard/posts/280562bc-...",
        "isRead": false,
        "createdAt": "2026-10-14T08:10:00.000Z",
        "actor": {
          "id": "actor-uuid",
          "name": "Alisher Qodirov",
          "handle": "alisher",
          "avatarUrl": "https://..."
        }
      }
    ]
  }
  ```

---

### 6.2. `POST /api/notifications/read`
Barcha yoki tanlangan bildirishnomalarni o'qilgan deb belgilash.

- **Method:** `POST`
- **Auth:** Majburiy
- **Request Body:** `{ "notificationIds": ["uuid-1", "uuid-2"] }` (bo'sh bo'lsa barchasini o'qilgan qiladi).

---

## 7. FOYDALANUVCHILAR VA PROFIL (USERS)

### 7.1. `GET /api/users/[handle]`
Foydalanuvchining ochiq profilini olish.

- **Method:** `GET`
- **Path Param:** `handle` (masalan: `@bziyatov` yoki `bziyatov`)
- **Auth:** Ixtiyoriy
- **Response 200:** Foydalanuvchi ma'lumotlari, ijtimoiy havolalari, postlar soni, followers/following soni va `isFollowing` holati.

---

### 7.2. `POST /api/users/[handle]/follow`
Foydalanuvchiga obuna bo'lish yoki obunani bekor qilish (Follow toggle).

- **Method:** `POST`
- **Auth:** Majburiy
- **Tekshiruvlar:** O'z-o'ziga obuna bo'lish qat'iy taqiqlangan (`check: follower_id != following_id`).
- **Response 200:** `{ "success": true, "data": { "isFollowing": true, "followersCount": 46 } }`

---

## 8. MEDIA VA FAYL YUKLASH (UPLOAD)

### 8.1. `POST /api/upload`
Tasvir yoki media faylni Bunny.net CDN xotirasiga yuklash.

- **Method:** `POST`
- **Auth:** Majburiy
- **Request Content-Type:** `multipart/form-data`
- **Maydon:** `file` (File binary)
- **Cheklovlar:**
  - MIME type: `image/jpeg`, `image/png`, `image/webp`, `image/gif`
  - Max fayl hajmi: 5MB
- **Response 200:**
  ```json
  {
    "success": true,
    "data": {
      "url": "https://local-network.b-cdn.net/uploads/2026/10/img_92837.webp",
      "width": 1200,
      "height": 800
    }
  }
  ```

---

## 9. ADMINISTRATOR APILARI (ADMIN)

### 9.1. `GET /api/admin/overview`
Tizim statistikasi va umumiy ko'rsatkichlar.

- **Method:** `GET`
- **Auth:** Admin Guard (`ADMIN`, `SUPER_ADMIN` yoki `ADMIN_EMAILS`)
- **Response 200:**
  ```json
  {
    "success": true,
    "data": {
      "users": { "total": 142, "real": 118, "bots": 24 },
      "posts": { "total": 850, "real": 720, "bots": 130 },
      "comments": { "total": 1420 },
      "engine": {
        "isActive": true,
        "dailyLimit": 30,
        "todayCount": 12,
        "lastActivityAt": "2026-10-14T08:00:00.000Z"
      },
      "recentLogs": [ ... ]
    }
  }
  ```

---

### 9.2. `GET /api/admin/users`
Foydalanuvchilar ro'yxati, filtrlash va qidirish.

- **Method:** `GET`
- **Auth:** Admin Guard
- **Query Params:**
  - `filter`: `"all"` | `"real"` | `"bots"`
  - `q`: string (ism, handle, email bo'yicha qidirish)
  - `limit`: number (max 100)
  - `offset`: number
- **Response 200:** `{ "success": true, "data": { "users": [...], "total": 142 } }`

---

### 9.3. `DELETE /api/admin/users/[id]`
Foydalanuvchini bloklash / hisobni to'xtatish.

- **Method:** `DELETE`
- **Auth:** Admin Guard
- **Response 200:** `{ "success": true, "data": { "message": "Foydalanuvchi muzlatildi" } }`

---

### 9.4. `DELETE /api/admin/posts/[id]`
Qoidabuzar postni o'chirish (Soft delete).

- **Method:** `DELETE`
- **Auth:** Admin Guard
- **Response 200:** `{ "success": true, "data": { "message": "Post o'chirildi" } }`

---

### 9.5. `POST /api/admin/bots/action`
AI Bot Engine boshqaruvi (post generatsiyasi, limitlar).

- **Method:** `POST`
- **Auth:** Admin Guard
- **Request Body:**
  ```json
  {
    "action": "trigger_post" // yoki "toggle_engine", "set_daily_limit"
  }
  ```
- **Response 200:** Amaliyot natijasi.
