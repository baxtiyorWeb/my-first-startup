export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "Fikr API Documentation",
    version: "1.0.0",
    description:
      "Fikr — Intellektual, chuqur fikrlar va tahliliy munozaralar platformasi uchun ishlab chiqilgan rasmiy RESTful API spetsifikatsiyasi.",
    contact: {
      name: "Fikr Engineering Team",
      url: "https://fikr.uz",
    },
  },
  servers: [
    {
      url: "/api",
      description: "Asosiy API server",
    },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "fikr_session",
        description: "HttpOnly sessiya cookie",
      },
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          error: {
            type: "object",
            properties: {
              code: { type: "string", example: "VALIDATION_ERROR" },
              message: { type: "string", example: "Xatolik xabari" },
              details: { type: "array", items: { type: "object" } },
            },
            required: ["code", "message"],
          },
        },
        required: ["success", "error"],
      },
      Author: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string", example: "Botir Ziyatov" },
          handle: { type: "string", example: "@bziyatov" },
          role: { type: "string", example: "Senior Software Architect" },
          avatarUrl: { type: "string", nullable: true },
          verified: { type: "boolean", example: true },
        },
        required: ["id", "name", "handle", "role", "verified"],
      },
      Post: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          title: { type: "string", nullable: true, example: "Dasturiy ta'minotda YAGNI tamoyili" },
          content: { type: "string", example: "Fikrning to‘liq matni..." },
          readingTimeMinutes: { type: "integer", example: 2 },
          likesCount: { type: "integer", example: 68 },
          commentsCount: { type: "integer", example: 19 },
          sharesCount: { type: "integer", example: 12 },
          createdAt: { type: "string", format: "date-time" },
          isLiked: { type: "boolean", example: false },
          isSaved: { type: "boolean", example: false },
          author: { $ref: "#/components/schemas/Author" },
        },
        required: ["id", "content", "readingTimeMinutes", "likesCount", "commentsCount", "sharesCount", "createdAt", "isLiked", "isSaved", "author"],
      },
      Comment: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          postId: { type: "string", format: "uuid" },
          parentId: { type: "string", format: "uuid", nullable: true },
          content: { type: "string", example: "Fikrga to‘liq qo‘shilaman..." },
          likesCount: { type: "integer", example: 5 },
          isLiked: { type: "boolean", example: false },
          createdAt: { type: "string", format: "date-time" },
          author: { $ref: "#/components/schemas/Author" },
          replies: {
            type: "array",
            items: { $ref: "#/components/schemas/Comment" },
          },
        },
        required: ["id", "postId", "content", "likesCount", "isLiked", "createdAt", "author"],
      },
    },
  },
  paths: {
    "/auth/otp": {
      post: {
        summary: "SMS-OTP kodini so‘rash",
        description: "Foydalanuvchining telefon raqamiga 4 xonali tasdiqlash kodini yuboradi. Rate-limit: 1 soatda max 5 ta.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  phone: { type: "string", example: "+998 90 123 45 67" },
                },
                required: ["phone"],
              },
            },
          },
        },
        responses: {
          200: {
            description: "Kod yuborildi",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        message: { type: "string", example: "Kod yuborildi" },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { $ref: "#/components/schemas/ErrorResponse" },
          429: { $ref: "#/components/schemas/ErrorResponse" },
        },
      },
    },
    "/auth/verify": {
      post: {
        summary: "SMS-OTP kodini tasdiqlash va sessiya olish",
        description: "4 xonali kodni tekshiradi, user yaratadi yoki topadi, HttpOnly sessiya cookie beradi.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  phone: { type: "string", example: "+998 90 123 45 67" },
                  code: { type: "string", example: "1234" },
                },
                required: ["phone", "code"],
              },
            },
          },
        },
        responses: {
          200: { description: "Muvaffaqiyatli autentifikatsiya" },
          400: { $ref: "#/components/schemas/ErrorResponse" },
        },
      },
    },
    "/auth/session": {
      get: {
        summary: "Joriy sessiya ma’lumotlarini olish",
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: {
          200: { description: "Sessiya holati" },
          401: { $ref: "#/components/schemas/ErrorResponse" },
        },
      },
    },
    "/auth/logout": {
      post: {
        summary: "Tizimdan chiqish",
        responses: {
          200: { description: "Sessiya tozalandi" },
        },
      },
    },
    "/auth/onboarding": {
      post: {
        summary: "Onboarding profil ma’lumotlarini to‘ldirish",
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string", example: "Alisher Qodirov" },
                  handle: { type: "string", example: "@alisher" },
                  role: { type: "string", example: "Senior Frontend Engineer" },
                  bio: { type: "string", example: "Qisqacha bio..." },
                },
                required: ["name", "handle", "role"],
              },
            },
          },
        },
        responses: {
          200: { description: "Profil to‘ldirildi" },
          400: { $ref: "#/components/schemas/ErrorResponse" },
          409: { $ref: "#/components/schemas/ErrorResponse" },
        },
      },
    },
    "/posts": {
      get: {
        summary: "Lenta (Feed) fikrlarini olish",
        parameters: [
          { name: "cursor", in: "query", schema: { type: "string" }, description: "Keyingi sahifa uchun vaqt kursori" },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
        ],
        responses: {
          200: {
            description: "Postlar ro‘yxati",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Post" },
                    },
                    meta: {
                      type: "object",
                      properties: {
                        nextCursor: { type: "string", nullable: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        summary: "Yangi fikr yozish",
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string", nullable: true },
                  content: { type: "string", minLength: 5 },
                },
                required: ["content"],
              },
            },
          },
        },
        responses: {
          201: { description: "Fikr yaratildi" },
          400: { $ref: "#/components/schemas/ErrorResponse" },
          401: { $ref: "#/components/schemas/ErrorResponse" },
        },
      },
    },
    "/posts/{id}": {
      delete: {
        summary: "Fikrni o‘chirish (BOLA/IDOR himoyalangan)",
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          200: { description: "Fikr o‘chirildi" },
          403: { description: "Faqat muallif o‘chira oladi" },
          404: { description: "Fikr topilmadi" },
        },
      },
    },
    "/posts/{id}/like": {
      post: {
        summary: "Fikrga layk bosish / bekor qilish (Toggle)",
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          200: { description: "Layk holati yangilandi" },
        },
      },
    },
    "/posts/{id}/bookmark": {
      post: {
        summary: "Fikrni saqlash / saqlanganlardan o‘chirish (Toggle)",
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          200: { description: "Saqlash holati yangilandi" },
        },
      },
    },
    "/posts/{id}/comments": {
      get: {
        summary: "Post izohlari va daraxtsimon javoblarni olish",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          200: {
            description: "Izohlar daraxti",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Comment" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        summary: "Postga izoh yoki mavjud izohga javob qoldirish",
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  content: { type: "string", minLength: 2 },
                  parentId: { type: "string", format: "uuid", nullable: true },
                },
                required: ["content"],
              },
            },
          },
        },
        responses: {
          201: { description: "Izoh qoldirildi" },
          400: { $ref: "#/components/schemas/ErrorResponse" },
        },
      },
    },
    "/users/{handle}": {
      get: {
        summary: "Muallif profili va statistikasini olish",
        parameters: [
          { name: "handle", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Profil ma’lumotlari" },
          404: { $ref: "#/components/schemas/ErrorResponse" },
        },
      },
    },
    "/users/{handle}/follow": {
      post: {
        summary: "Muallifni kuzatish / kuzatishni to‘xtatish (Toggle)",
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [
          { name: "handle", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Kuzatuv holati yangilandi" },
          400: { description: "O‘zini kuzatish taqiqlangan" },
        },
      },
    },
    "/users/me": {
      patch: {
        summary: "Shaxsiy profil ma’lumotlarini tahrirlash",
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  role: { type: "string" },
                  bio: { type: "string" },
                  location: { type: "string" },
                  website: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Profil yangilandi" },
        },
      },
    },
    "/search": {
      get: {
        summary: "Mualliflar va fikrlarni qidirish",
        parameters: [
          { name: "q", in: "query", required: true, schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
        ],
        responses: {
          200: { description: "Qidiruv natijalari" },
        },
      },
    },
    "/reports": {
      post: {
        summary: "Shikoyat yuborish",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  targetId: { type: "string" },
                  targetType: { type: "string", enum: ["post", "comment", "user"] },
                  reason: { type: "string" },
                  context: { type: "string" },
                },
                required: ["targetId", "targetType", "reason"],
              },
            },
          },
        },
        responses: {
          200: { description: "Shikoyat qabul qilindi" },
          429: { description: "Limit oshirildi" },
        },
      },
    },
  },
};
