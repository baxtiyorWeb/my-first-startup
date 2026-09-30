/**
 * Google Gemini API Client for Autonomous Bot Engine
 * Supports natural Uzbek language generation for posts, comments, and user profiles.
 */

interface GeminiPart {
  text: string;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
    finishReason?: string;
  }>;
  error?: {
    code: number;
    message: string;
  };
}

export class GeminiClient {
  private apiKey: string;
  private primaryModel: string;
  private fallbackModel: string;

  constructor() {
    this.apiKey = process.env.GOOGLE_GEMINI_API_KEY || "";
    this.primaryModel = "gemini-2.5-flash";
    this.fallbackModel = "gemini-3.5-flash";
  }

  private async callGemini(
    prompt: string,
    systemInstruction?: string,
    modelOverride?: string,
    isJson: boolean = false
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error("GOOGLE_GEMINI_API_KEY is not set in environment variables");
    }

    const model = modelOverride || this.primaryModel;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

    const generationConfig: Record<string, unknown> = {
      temperature: 0.85,
      topP: 0.95,
      maxOutputTokens: 1024,
    };

    if (isJson) {
      generationConfig.responseMimeType = "application/json";
    }

    const body: Record<string, unknown> = {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig,
    };

    if (systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        // If primary model failed, try fallback
        if (model === this.primaryModel) {
          console.warn(`[GEMINI] Model ${model} failed (${response.status}), trying fallback ${this.fallbackModel}...`);
          return this.callGemini(prompt, systemInstruction, this.fallbackModel, isJson);
        }
        const errText = await response.text();
        throw new Error(`Gemini API error (${response.status}): ${errText}`);
      }

      const data = (await response.json()) as GeminiResponse;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
      return text;
    } catch (error) {
      if (model === this.primaryModel && this.fallbackModel !== this.primaryModel) {
        console.warn(`[GEMINI] Primary call failed, attempting fallback:`, error);
        return this.callGemini(prompt, systemInstruction, this.fallbackModel, isJson);
      }
      throw error;
    }
  }

  /**
   * Generate an organic post in Uzbek based on the bot's persona and platform context.
   */
  async generatePost(options: {
    persona: string;
    role: string;
    name: string;
    recentTopics?: string[];
  }): Promise<{
    title: string;
    content: string;
    postType: "thought" | "project";
    projectStage?: string;
    lookingFor?: string;
  }> {
    const systemPrompt = `Siz ijtimoiy tarmoqdagi haqiqiy inson - o'zbek foydalanuvchisiz.
Ismingiz: ${options.name}
Kasbingiz/Rolingiz: ${options.role}
Shaxsiyatingiz va dunyoqarashingiz: ${options.persona}

MUHIM QOIDALAR:
1. AI yoki bot ekanligingizni hecham bildirmang. Siz haqiqiy insonsiz.
2. Rasmiy, kitobiy, ma'ruzanamo tildan mutlaqo qoching ("Hurmatli do'stlar", "Bugun biz ko'rib chiqamiz" kabi gaplar TAQIQLANADI).
3. Jonli, samimiy o'zbek tilida, qiziqarli so'zlashuv uslubida yozing (masalan: "kecha shunaqa holat bo'ldi", "menimcha", "sizda ham shunaqa bo'lganmi?", "rostan qiziq").
4. Post hajmi: 2 tadan 4 tagacha ixcham abzas. O'qishga juda qulay, foydali, o'ylantiradigan yoki samimiy savol bilan yakunlanuvchi bo'lsin.
5. Javobni FAQAT toza JSON formatida qaytaring, boshqa hech qanday so'z qo'shmang:
{
  "title": "Jozibador, qisqa sarlavha (1 qator)",
  "content": "Postning asosiy mazmuni (2-3 abzas)",
  "postType": "thought"
}`;

    const contextText = options.recentTopics && options.recentTopics.length > 0
      ? `Platformada hozir aylanayotgan oxirgi mavzular: ${options.recentTopics.join(", ")}. Bunga mos, yangicha fikr yoki savol o'rtaga tashlang.`
      : `O'zingizning kasbingiz (${options.role}) va hayotiy/kasbiy tajribangizdan kelib chiqib, odamlarni fikr bildirishga chorlaydigan qiziqarli post yozing.`;

    const raw = await this.callGemini(contextText, systemPrompt, undefined, true);
    const parsed = this.parseJsonSafe<{
      title?: string;
      content?: string;
      postType?: "thought" | "project";
    }>(raw, {});

    let title = parsed.title?.trim() || "";
    let content = parsed.content?.trim() || "";

    // If parsing failed or JSON syntax leaked, cleanly strip JSON artifacts
    if (!content || content.includes('"content":') || content.includes('{"title":')) {
      content = raw
        .replace(/\{[\s\S]*?"content"\s*:\s*"/, "")
        .replace(/"\s*,?\s*"postType"[\s\S]*$/, "")
        .replace(/\\"/g, '"')
        .replace(/\\n/g, "\n")
        .replace(/[\{\}\[\]]/g, "")
        .trim();
    }

    if (!title || title.includes('"title":')) {
      title = `${options.role} sifatida bir fikr`;
    }

    return {
      title: title.replace(/^["']|["']$/g, "").trim(),
      content: content.replace(/^["']|["']$/g, "").trim(),
      postType: parsed.postType || "thought",
    };
  }

  /**
   * Generate a natural comment on a post.
   */
  async generateComment(options: {
    botName: string;
    botRole: string;
    botPersona: string;
    postTitle?: string | null;
    postContent: string;
    existingComments?: string[];
  }): Promise<string> {
    const systemPrompt = `Siz internetda post o'qiyotgan oddiy o'zbekistonlik foydalanuvchisiz.
Ismingiz: ${options.botName} (${options.botRole})
Sizning xarakteringiz: ${options.botPersona}

QAT'IY QOIDALAR:
1. Komment JUDA QISQA bo'lsin: 1 yoki 2 ta gap (ko'pi bilan 3 ta qisqa gap). Odamlar kommentga insho yozmaydi!
2. Sun'iy gapirmang ("Assalomu alaykum ajoyib post bo'libdi" deb shablon yozish TAQIQLANADI).
3. Tabiiy munosabat bildiring:
   - Yoki qisqa savol bering ("Qancha vaqt ketdi buni qilishga?", "Qaysi texnologiyani ishlatdingiz?")
   - Yoki o'z tajribangizdan 1 ta jumla ayting ("Bizda ham shunaqa muammo bo'lgandi")
   - Yoki muqobil fikr bildiring ("Lekin hamma vaziyatda ham bu ishlamasa kerak-a?")
   - Yoki do'stona qo'llab-quvvatlang / yengil hazil qiling.
4. FAQAT komment matnini qaytaring. Qo'shimcha tushuntirish, qo'shtirnoq yoki belgilarsiz.`;

    const userPrompt = `Post sarlavhasi: ${options.postTitle || "Fikr"}
Post matni:
"""${options.postContent.slice(0, 800)}"""

${options.existingComments && options.existingComments.length > 0 ? `Avvalgi fikrlar: ${options.existingComments.slice(0, 3).join(" | ")}` : ""}

Ushbu postga xarakteringizga mos 1 ta tabiiy jonli izoh yozing:`;

    const comment = await this.callGemini(userPrompt, systemPrompt);
    return comment.replace(/^["']|["']$/g, "").trim();
  }

  /**
   * Generate a realistic Uzbek user profile.
   */
  async generateProfile(existingHandles: string[]): Promise<{
    name: string;
    handle: string;
    role: string;
    bio: string;
    avatarUrl: string;
    persona: string;
  }> {
    const systemPrompt = `O'zbekistondagi faol ijtimoiy tarmoq foydalanuvchisi uchun realistik profil ma'lumotlarini yarating.
Bozor: Dasturlash, dizayn, startap, marketing, biznes, fan, kitobxonlik yoki talabalik.
Ismlar haqiqiy o'zbekcha bo'lsin (masalan: Sardor Rahimov, Dilnoza Aliyeva, Temur Po'latov, Madina Karimova, Azizbek Yoqubov, Umidjon Saidov, Kamola Ismoilova).

QAT'IY JSON FORMATIDA QAYTARING:
{
  "name": "Ism Familiya",
  "handle": "lotincha_kichik_harflar_va_raqam",
  "role": "Kasbi yoki unvoni (masalan: Frontend Dasturchi, UI/UX Dizayner, EdTech Asoschisi, Marketing Mutaxassisi, Talaba)",
  "bio": "1-2 jumlali tabiiy shaxsiy bio (masalan: Yangi texnologiyalar va startaplarni sinab ko'rishni yaxshi ko'raman. Kitoblar va kod.)",
  "gender": "male" yoki "female",
  "persona": "Botning ichki yozish xarakteri: masalan: 'Jiddiy, tahliliy, ko'p savol beruvchi, IT va moliyaga qiziqadi' yoki 'Quvnoq, samimiy, yosh startapchi'"
}`;

    const userPrompt = `Yangi qiziqarli o'zbek foydalanuvchisi profilini yarating. Mavjud band username-lar: ${existingHandles.slice(0, 30).join(", ")}. Ularni takrorlamang.`;
    const raw = await this.callGemini(userPrompt, systemPrompt, undefined, true);

    const parsed = this.parseJsonSafe(raw, {
      name: "Sardor Rahimov",
      handle: `user_${Math.floor(1000 + Math.random() * 9000)}`,
      role: "Go-getter",
      bio: "Yangi imkoniyatlar va startaplar sari intiluvchi.",
      gender: "male",
      persona: "Samimiy, do'stona va fikr almashishga ochiq.",
    });

    // Generate reliable avatar URL based on gender/seed
    const seed = parsed.handle || Math.random().toString(36).substring(7);
    const avatarCollection = parsed.gender === "female" ? "personas" : "micah";
    const avatarUrl = `https://api.dicebear.com/7.x/${avatarCollection}/svg?seed=${encodeURIComponent(seed)}`;

    return {
      name: parsed.name,
      handle: parsed.handle.toLowerCase().replace(/[^a-z0-9_]/g, ""),
      role: parsed.role,
      bio: parsed.bio,
      avatarUrl,
      persona: parsed.persona,
    };
  }

  private parseJsonSafe<T>(raw: string, fallback: T): T {
    try {
      const firstBrace = raw.indexOf("{");
      const lastBrace = raw.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const jsonSubstring = raw.slice(firstBrace, lastBrace + 1);
        return JSON.parse(jsonSubstring) as T;
      }
      const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*$/gi, "").trim();
      return JSON.parse(cleaned) as T;
    } catch {
      return fallback;
    }
  }
}

export const gemini = new GeminiClient();
