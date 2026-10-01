/**
 * AI Client: Google Gemini (primary) + OpenRouter multi-model fallback
 *
 * Fallback chain (all free-tier or near-free):
 *  1. gemini-3.5-flash          (Google Gemini, primary)
 *  2. gemini-flash-latest       (Google Gemini, secondary)
 *  3. meta-llama/llama-3.3-70b-instruct:free  (Meta, 70B, excellent reasoning)
 *  4. deepseek/deepseek-chat:free             (DeepSeek, top-tier text & code)
 *  5. qwen/qwen-2.5-72b-instruct:free         (Alibaba Qwen 72B, multilingual)
 *  6. google/gemini-2.0-flash-exp:free        (Gemini via OpenRouter, free quota)
 *  7. mistralai/mistral-7b-instruct:free      (Mistral, fast lightweight fallback)
 */

// ─── Gemini types ────────────────────────────────────────────────────────────

interface GeminiPart {
  text?: string;
  thoughtSignature?: string;
}

interface GroundingMetadata {
  webSearchQueries?: string[];
  searchEntryPoint?: { renderedContent?: string };
  groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
}

interface GeminiCandidate {
  content?: { parts?: GeminiPart[] };
  finishReason?: string;
  groundingMetadata?: GroundingMetadata;
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  error?: { code: number; message: string; status?: string };
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    thoughtsTokenCount?: number;
  };
}

// ─── OpenRouter (OpenAI-compatible) types ────────────────────────────────────

interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenRouterResponse {
  choices?: Array<{
    message?: { content?: string };
    finish_reason?: string;
  }>;
  error?: { message: string; code?: number };
}

// ─── Shared options ───────────────────────────────────────────────────────────

export interface CallGeminiOptions {
  modelOverride?: string;
  isJson?: boolean;
  enableSearch?: boolean;
  temperature?: number;
  retries?: number;
}

// ─── OpenRouter free models (fallback chain) ──────────────────────────────────

/**
 * Ordered list of OpenRouter free models.
 * Each is tried in sequence if the previous one fails.
 */
const OPENROUTER_FREE_MODELS = [
  "google/gemma-2-9b-it:free",               // Gemma 2 9B (Free on OpenRouter)
  "meta-llama/llama-3.1-8b-instruct:free",   // Llama 3.1 8B (Free on OpenRouter)
  "meta-llama/llama-3.3-70b-instruct",       // Meta Llama 3.3 70B
  "deepseek/deepseek-chat",                   // DeepSeek V3 Chat
  "qwen/qwen-2.5-72b-instruct",               // Alibaba Qwen 2.5 72B
] as const;

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions";

// ─── GeminiClient ─────────────────────────────────────────────────────────────

export class GeminiClient {
  private geminiKey: string;
  private openRouterKey: string;
  private primaryModel: string;
  private geminiSecondary: string;

  constructor() {
    this.geminiKey = process.env.GOOGLE_GEMINI_API_KEY || "";
    this.openRouterKey = process.env.OPEN_ROUTER_API_KEY || "";
    this.primaryModel = "gemini-2.0-flash";
    this.geminiSecondary = "gemini-1.5-flash";
  }

  // ── helpers ──────────────────────────────────────────────────────────────────

  private delay(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Guarantee identity consistency and strip hallucinated author names.
   */
  public sanitizeAuthorIdentity(text: string, botName: string): string {
    if (!text || !botName) return text;

    const firstName = botName.split(" ")[0] || botName;

    // Pattern 1: "Men [Other Name], ..." or "Men [Other Name] ..."
    let cleaned = text.replace(/Men\s+([A-ZÀ-Ўa-zà-ў']+(?:\s+[A-ZÀ-Ўa-zà-ў']+)?)(?=,|\s+—|\s+sun'iy|\s+dasturchi|\s+mutaxassis|\s+va\b)/g, (match, capturedName) => {
      if (capturedName.toLowerCase().includes(firstName.toLowerCase()) || botName.toLowerCase().includes(capturedName.toLowerCase())) {
        return match;
      }
      return `Men ${botName}`;
    });

    // Pattern 2: "Ismim [Other Name]"
    cleaned = cleaned.replace(/Ismim\s+([A-ZÀ-Ўa-zà-ў']+(?:\s+[A-ZÀ-Ўa-zà-ў']+)?)/g, (match, capturedName) => {
      if (capturedName.toLowerCase().includes(firstName.toLowerCase())) {
        return match;
      }
      return `Ismim ${botName}`;
    });

    // Pattern 3: Trailing signature mismatch (e.g. "— Abdulaziz", "- Sardor Rahimov")
    cleaned = cleaned.replace(/(?:—|-)\s*([A-ZÀ-Ўa-zà-ў']+(?:\s+[A-ZÀ-Ўa-zà-ў']+)?)$/g, (match, capturedName) => {
      if (capturedName.toLowerCase().includes(firstName.toLowerCase())) {
        return match;
      }
      return `— ${botName}`;
    });

    return cleaned;
  }

  /**
   * Curated high quality Unsplash images for post enhancement.
   */
  public getTopicCoverImage(topicFocus?: string, role?: string): string {
    const text = `${topicFocus || ""} ${role || ""}`.toLowerCase();

    if (/dizayn|ui|ux|figma|interfeys/i.test(text)) {
      const designImages = [
        "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1561070791-2526d30994b5?q=80&w=1200&auto=format&fit=crop",
      ];
      return designImages[Math.floor(Math.random() * designImages.length)];
    }

    if (/startap|biznes|pm|investitsiya|mvp/i.test(text)) {
      const startupImages = [
        "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1200&auto=format&fit=crop",
      ];
      return startupImages[Math.floor(Math.random() * startupImages.length)];
    }

    if (/kod|dastur|dev|backend|frontend|ai|sun'iy|algoritm/i.test(text)) {
      const techImages = [
        "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1677442136019-21780efad99a?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=1200&auto=format&fit=crop",
      ];
      return techImages[Math.floor(Math.random() * techImages.length)];
    }

    const defaultImages = [
      "https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop",
    ];
    return defaultImages[Math.floor(Math.random() * defaultImages.length)];
  }

  private parseJsonSafe<T>(raw: string, fallback: T): T {
    const attempts = [
      () => JSON.parse(raw.trim()),
      () => JSON.parse(raw.replace(/^```json\s*/gi, "").replace(/```\s*$/gi, "").trim()),
      () => {
        const first = raw.indexOf("{");
        const last = raw.lastIndexOf("}");
        if (first !== -1 && last !== -1 && last > first) {
          return JSON.parse(raw.slice(first, last + 1));
        }
        throw new Error("no JSON object found");
      },
    ];
    for (const attempt of attempts) {
      try {
        return attempt() as T;
      } catch {
        // try next
      }
    }
    return fallback;
  }

  // ── OpenRouter call ───────────────────────────────────────────────────────────

  /**
   * Call a specific OpenRouter model (OpenAI-compatible API).
   * Returns raw text. Throws on HTTP/API error.
   */
  private async callOpenRouterModel(
    model: string,
    prompt: string,
    systemInstruction: string | undefined,
    temperature: number
  ): Promise<string> {
    if (!this.openRouterKey) {
      throw new Error("OPEN_ROUTER_API_KEY is not set");
    }

    const messages: OpenRouterMessage[] = [];
    if (systemInstruction) {
      messages.push({ role: "system", content: systemInstruction });
    }
    messages.push({ role: "user", content: prompt });

    const response = await fetch(OPENROUTER_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.openRouterKey}`,
        "HTTP-Referer": "https://thego-getters.vercel.app",
        "X-Title": "GoGetters Bot Engine",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter [${model}] HTTP ${response.status}: ${errText.slice(0, 200)}`);
    }

    const data = (await response.json()) as OpenRouterResponse;

    if (data.error) {
      throw new Error(`OpenRouter [${model}] error: ${data.error.message}`);
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error(`OpenRouter [${model}] returned empty content`);
    }

    return content.trim();
  }

  /**
   * Try all OpenRouter free models in sequence until one succeeds.
   * Logs which model eventually responded.
   */
  private async callOpenRouterFallback(
    prompt: string,
    systemInstruction: string | undefined,
    temperature: number
  ): Promise<string> {
    const errors: string[] = [];

    for (const model of OPENROUTER_FREE_MODELS) {
      try {
        const result = await this.callOpenRouterModel(model, prompt, systemInstruction, temperature);
        console.log(`[AI] OpenRouter fallback succeeded with model: ${model}`);
        return result;
      } catch (err) {
        const msg = (err as Error).message;
        errors.push(`${model}: ${msg}`);
        console.warn(`[AI] OpenRouter model ${model} failed: ${msg}`);
        // Small delay between models to avoid bursting
        await this.delay(800);
      }
    }

    throw new Error(
      `All OpenRouter fallback models failed:\n${errors.join("\n")}`
    );
  }

  // ── Gemini call ───────────────────────────────────────────────────────────────

  /**
   * Core Gemini API call with retry and Gemini-to-Gemini fallback.
   * If both Gemini models fail, throws — caller should then try OpenRouter.
   */
  async callGemini(
    prompt: string,
    systemInstruction?: string,
    options: CallGeminiOptions = {}
  ): Promise<string> {
    if (!this.geminiKey) {
      // Skip Gemini entirely, go straight to OpenRouter
      console.warn("[AI] GOOGLE_GEMINI_API_KEY not set, going straight to OpenRouter");
      return this.callOpenRouterFallback(prompt, systemInstruction, options.temperature ?? 0.82);
    }

    const {
      modelOverride,
      isJson = false,
      enableSearch = false,
      temperature = 0.82,
      retries = 1,
    } = options;

    const model = modelOverride || this.primaryModel;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.geminiKey}`;

    const generationConfig: Record<string, unknown> = {
      temperature,
      topP: 0.95,
      maxOutputTokens: 4096,
    };

    const tools: Array<Record<string, unknown>> = [];
    if (enableSearch) {
      tools.push({ googleSearch: {} });
    }
    if (isJson && !enableSearch) {
      generationConfig.responseMimeType = "application/json";
    }

    const body: Record<string, unknown> = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
    };
    if (tools.length > 0) body.tools = tools;
    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        if (response.status === 429 && retries > 0) {
          console.warn(`[AI] Gemini rate limited (429) on ${model}, waiting 2.5s...`);
          await this.delay(2500);
          return this.callGemini(prompt, systemInstruction, { ...options, retries: retries - 1 });
        }

        // Try Gemini secondary model first
        if (model === this.primaryModel) {
          console.warn(`[AI] Gemini ${model} failed (${response.status}), trying secondary ${this.geminiSecondary}...`);
          try {
            return await this.callGemini(prompt, systemInstruction, {
              ...options,
              modelOverride: this.geminiSecondary,
              retries: 0,
            });
          } catch {
            // Secondary also failed, go to OpenRouter
          }
        }

        console.warn(`[AI] All Gemini models failed, switching to OpenRouter...`);
        return this.callOpenRouterFallback(prompt, systemInstruction, temperature);
      }

      const data = (await response.json()) as GeminiResponse;

      if (data.error) {
        throw new Error(`Gemini error: ${data.error.message}`);
      }

      const parts = data.candidates?.[0]?.content?.parts || [];
      const text = parts.map((p) => p.text || "").join("\n").trim();
      return text;
    } catch (error) {
      const msg = (error as Error).message;

      // If it's already an OpenRouter error re-thrown, don't recurse
      if (msg.startsWith("All OpenRouter fallback models failed")) {
        throw error;
      }

      // If Gemini primary threw a network/parse error, try secondary then OpenRouter
      if (model === this.primaryModel) {
        console.warn(`[AI] Gemini ${model} threw error: ${msg}. Trying secondary...`);
        try {
          return await this.callGemini(prompt, systemInstruction, {
            ...options,
            modelOverride: this.geminiSecondary,
            retries: 0,
          });
        } catch {
          // Both Gemini models failed
        }
      }

      console.warn(`[AI] Gemini completely failed, switching to OpenRouter...`);
      return this.callOpenRouterFallback(prompt, systemInstruction, temperature);
    }
  }

  // ── High-level generation methods ─────────────────────────────────────────────

  /**
   * Generate an organic, deeply reasoned post in Uzbek with balanced lengths,
   * rich formatting, and diverse topics.
   */
  async generatePost(options: {
    persona: string;
    role: string;
    name: string;
    writingStyle?: string;
    thoughtAngle?: string;
    recentTopics?: string[];
    withSearch?: boolean;
    topicFocus?: string;
    topicAngle?: string;
    searchAngle?: string;
    lengthTier?: "short" | "medium" | "long";
  }): Promise<{
    title: string;
    content: string;
    postType: "thought" | "project";
  }> {
    const {
      persona,
      role,
      name,
      writingStyle = "Samimiy, professional va amaliy",
      thoughtAngle = "Tajriba va amaliy kuzatuvlar",
      recentTopics = [],
      withSearch = false,
      topicFocus,
      topicAngle,
      searchAngle,
      lengthTier = "medium",
    } = options;

    const lengthGuide = {
      short: `HAJMI VA STRUKTURASI: QISQA FIKR / POST (Short thought, 35-70 so'z).
- 1 ta ixcham xatboshi yoki 2-3 ta o'tkir, lo'nda gap.
- Aniq 1 ta hayotiy kuzatuv, kutilmagan savol yoki qisqa falsafiy xulosa.
- Formatlash: Matnni <p> tegiga oling. Eng muhim 1 ta kalit iborani <strong> bilan ajrating. Kerak bo'lsa bitta nozik so'zga <mark> yoki <em> ishlating.
- Tugallangan, o'yga soluvchi yoki bahs uyg'otuvchi savol bilan tugating.`,

      medium: `HAJMI VA STRUKTURASI: O'RTACHA POST (Medium post, 90-160 so'z).
- 2 tadan 3 tagacha qisqa va ravon abzaslar (<p>...</p>).
- Hayotiy keys, amaliy maslahat yoki tajribadan olingan xulosa.
- Formatlash elementlaridan me'yorida va o'rinli foydalaning:
  * Har bir abzas uchun alohida <p>...</p>
  * Asosiy urg'u va kalit fikrlar uchun <strong>...</strong>
  * Asosiy qoida yoki iqtibos uchun bitta chiroyli <blockquote>...</blockquote>
  * Muhim atama yoki vosita bo'lsa <code>...</code>
  * Bitta eng diqqatga sazovor so'z/iborani <mark>...</mark> (sariq ta'kidlash) bilan ajratish mumkin.`,

      long: `HAJMI VA STRUKTURASI: TAHLILIY CHUQUR POST (Long analytical post / Guide, 180-300 so'z).
- Kengroq tahlil va tuzilmali ko'rinish.
- Kirish abzasidan (<p>) so'ng oraliq sarlavha (<h2>...</h2>), amaliy qadamlar yoki xulosalar ro'yxati (<ul><li>...</li></ul>), va iqtibos bloki (<blockquote>...</blockquote>).
- Formatlash elementlaridan to'liq va estetik foydalaning:
  * <h2>Qisqa bo'lim sarlavhasi</h2>
  * <strong>...</strong> bilan kalit tezislar
  * <ul><li>Band 1</li><li>Band 2</li><li>Band 3</li></ul> ro'yxat
  * <blockquote>Asosiy hayotiy xulosa yoki kitobdan fikr</blockquote>
  * Matnni <mark> va <code> bilan boyiting.`,
    }[lengthTier];

    const systemPrompt = `Siz O'zbekistondagi zamonaviy IT, startap, tadbirkorlik va ijodiy hamjamiyatning faol, taniqli va hurmatli vakilisiz.
Ismingiz: ${name}
Kasbingiz / Rolingiz: ${role}
Shaxsiyatingiz va dunyoqarashingiz: ${persona}
So'zlashuv uslubingiz: ${writingStyle}
Asosiy fikrlash yo'nalishingiz: ${thoughtAngle}

QAT'IY INSONIYLIK VA SIFAT TALABLARI:
1. SIZ HECH QACHON BOT EMASSIZ. Siz shaxsiy tajribasi, hissiyotlari va kuzatuvlariga ega bo'lgan tirik insonsiz.
2. HAMMA POSTLAR BIR XIL TEXNOLOGIYA YOKI KOD HAQIDA BO'LMASIN!
   - Insonlar faqat ish va kod haqida o'ylamaydi. Hatto yetakchi dasturchi yoki startapchi ham shaxsiy odatlar, diqqatni jamlash (Deep work), ertalabki tartib, uyqu va sog'liq, burnout, o'qigan yangi kitoblari, karyeradagi xatolari, networking va insoniy munosabatlar haqida yozadi.
   - Mavzuni keng, hayotiy va insoniy prizmadan yoriting.
3. SUN'IY, SHABLON BIRIKMALAR MUTLAQO TAQIQLANADI:
   - "Assalomu alaykum aziz obunachilar...", "Bugun men sizlar bilan muhim mavzuda fikr almashmoqchiman...", "Xulosa qilib aytganda..." kabi sun'iy jumlalarni ASLO ishlatmang!
   - Postni xuddi tirik inson kabi to'g'ridan-to'g'ri qiziq nuqtadan, savoldan yoki hayotiy keysdan boshlang.
4. BOY FORMAT ELEMENTLARI (RICH FORMATTING):
   Bizning platformamiz matn muharriri HTML teglari bilan formatlashni to'liq qo'llab-quvvatlaydi. Postni shunchaki xom matn qilmasdan, zamonaviy Medium/Substack bloglaridagi kabi chiroyli formatlang:
   - Abzaslar: <p>Matn...</p>
   - Urg'u / Kalit so'zlar: <strong>qalin matn</strong>
   - Nozik urg'ular: <em>kursiv matn</em>
   - Ta'kidlash (Highlight): <mark>muhim ibora</mark>
   - Iqtibos yoki qoida: <blockquote>Muhim hayotiy xulosa...</blockquote>
   - Atamalar yoki vositalar: <code>vosita_nomi</code>
   - Ro'yxatlar (zarur bo'lsa): <ul><li>Maslahat 1</li><li>Maslahat 2</li></ul>
   - Oraliq sarlavha (zarur bo'lsa): <h2>Mavzu</h2>
   OGOHLANTIRISH: Formatlashni me'yorida ishlating, butun matnni qalin yoki sariq qilib tashlamang. O'qishga qulay va estetik bo'lsin.
5. ${lengthGuide}
6. QAT'IY JSON FORMATIDA QAYTARING:
{
  "title": "Jozibador, qisqa va qiziq sarlavha (1 qator)",
  "content": "Formatlangan to'liq post mazmuni (HTML teglari bilan)",
  "postType": "thought"
}`;

    let userPrompt = "";

    if (topicAngle) {
      userPrompt = `Mavzu va yo'nalish: "${topicAngle}".
Ushbu mavzuni o'zingizning shaxsiyatingiz, insoniy tajribangiz va dunyoqarashingiz orqali yoriting. ${
  lengthTier === "short"
    ? "Qisqa, o'tkir va ta'sirchan qilib yozing."
    : lengthTier === "long"
    ? "Tuzilmali, chuqur tahliliy va yo'riqnoma tarzida yozing."
    : "Hayotiy misollar va aniq xulosa bilan o'rtacha hajmda yozing."
}`;
    } else if (topicFocus && topicFocus !== "all") {
      userPrompt = `Mavzu sohasi: "${topicFocus}". Ushbu sohadagi biror nozik, insoniy yoki kutilmagan haqiqat haqida post yozing.`;
    } else {
      userPrompt = `Shaxsiy rivojlanish, mahsuldorlik, odatlar, insoniy munosabatlar, biznes yoki kasbiy tajribangizdagi biror muhim hayotiy xulosa haqida jonli post yozing.`;
    }

    if (recentTopics.length > 0) {
      userPrompt += ` (Platformadagi oxirgi muhokamalar: ${recentTopics.slice(0, 3).join(", ")}. Bularni takrorlamang, mutlaqo yangi va mustaqil mavzuni oching).`;
    }

    if (withSearch) {
      const searchInstruction = searchAngle
        ? `Internetdan aynan "${searchAngle}" bo'yicha eng so'nggi 2026-yilgi global faktlar, tadqiqotlar yoki yangi ma'lumotlarni qidirib, shular asosida postni juda qiziqarli ma'lumot bilan boyiting.`
        : `Internetdagi eng so'nggi 2026-yilgi tadqiqotlar, yangi tendensiyalar yoki statistikaga tayanib, o'quvchi uchun yangilik bo'ladigan qiziqarli fakt bilan boyiting. Faqat texnologiya bilan cheklanib qolmang — odamlar, psixologiya, biznes, odatlar yoki bozor tendensiyalarini ham qamrab oling.`;
      userPrompt += `\n${searchInstruction}`;
    }

    let raw = "";
    try {
      raw = await this.callGemini(userPrompt, systemPrompt, {
        enableSearch: withSearch,
        isJson: true,
        temperature: 0.85,
      });
    } catch (err) {
      if (withSearch) {
        console.warn("[AI] Search generation failed, falling back to standard generation:", err);
        try {
          raw = await this.callGemini(userPrompt, systemPrompt, {
            enableSearch: false,
            isJson: true,
            temperature: 0.85,
          });
        } catch (innerErr) {
          console.warn("[AI] Standard generation also failed, using offline post template:", innerErr);
          return this.getOfflineFallbackPost(role, topicFocus || topicAngle);
        }
      } else {
        console.warn("[AI] Post generation failed, using offline post template:", err);
        return this.getOfflineFallbackPost(role, topicFocus || topicAngle);
      }
    }

    const parsed = this.parseJsonSafe<{
      title?: string;
      content?: string;
      postType?: "thought" | "project";
    }>(raw, {});

    let title = (parsed.title || "").trim();
    let content = (parsed.content || "").trim();

    title = title
      .replace(/^"(?:title|content)":\s*"?/i, "")
      .replace(/^title":\s*"?/i, "")
      .replace(/^[\"']|[\"']$/g, "")
      .trim();

    content = content
      .replace(/^"(?:title|content)":\s*"?/i, "")
      .replace(/^title":\s*"?/i, "")
      .replace(/^content":\s*"?/i, "")
      .replace(/^[\"']|[\"']$/g, "")
      .trim();

    if (!content || content.length < 25) {
      const fallback = this.getOfflineFallbackPost(role, topicFocus || topicAngle);
      title = title || fallback.title;
      content = fallback.content;
    }

    if (!content.includes("<p>") && !content.includes("<h2") && !content.includes("<blockquote")) {
      content = content
        .split(/\n\s*\n/)
        .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br />")}</p>`)
        .join("");
    }

    if (!title || title.length < 5) {
      title = `${role} sifatida bir mulohaza`;
    }

    return {
      title,
      content,
      postType: parsed.postType || "thought",
    };
  }

  /**
   * Generate an intelligent, human-like comment on a post.
   */
  async generateComment(options: {
    botName: string;
    botRole: string;
    botPersona: string;
    writingStyle?: string;
    thoughtAngle?: string;
    postTitle?: string | null;
    postContent: string;
    existingComments?: string[];
    deepReasoning?: boolean;
    withSearch?: boolean;
  }): Promise<string> {
    const {
      botName,
      botRole,
      botPersona,
      writingStyle = "Aniq, samimiy va fikrlovchi",
      thoughtAngle = "Amaliy tajriba",
      postTitle,
      postContent,
      existingComments = [],
      deepReasoning = true,
      withSearch = false,
    } = options;

    const systemPrompt = `Siz ushbu platformada postlarni mutolaa qilayotgan o'zbekistonlik mutaxassis va foydalanuvchisiz.
Ismingiz: ${botName} (${botRole})
Xarakteringiz: ${botPersona}
Uslubingiz: ${writingStyle}
Nuqtai nazaringiz: ${thoughtAngle}

MUHIM QOIDALAR (TABIIYLIK VA CHUQUR FIKRLASH):
1. SHABLON VA SOXTA XUSHOMADDAN QOCHING:
   - "Ajoyib post bo'libdi!", "Rahmat foydali ma'lumot uchun!", "To'liq qo'shilaman!" kabi sun'iy va ma'nosiz gaplarni YOG'DIRMANG.
2. CHUQUR FIKRLASH (REASONING):
   Postni chuqur tahlil qiling va quyidagi 4 ta usuldan BITTASINI tanlab yozing:
   - A) Amaliy tajribangizdan 1 ta nozik misol keltiring ("Bizda ham xuddi shunday holat bo'lgan, ayniqsa...")
   - B) O'yga soluvchi chuqur savol bering ("Yondashuv qiziq, lekin trafik 5 barobar oshganda bu arxitektura qanday javob beradi?")
   - C) Do'stona, ammo konstruktiv muqobil fikr bildiring ("Lekin har doim ham bu qoida ishlamasa kerak, ayniqsa B2B sohasida...")
   - D) Noodatiy va foydali kuzatuv qo'shing ("Aynan shu masalada ko'pchilik e'tibordan chetda qoldiradigan 1 ta nozik joyi bor...")
3. HAJMI: Qisqa va o'tkir bo'lsin: 1 tadan 3 tagacha qisqa, ta'sirchan gap. Odamlar kommentga maqola yozmaydi!
4. FAQAT va FAQAT sharh matnini qaytaring. Qo'shtirnoqsiz, prefikssiz, izohlarsiz.
5. QAT'IY SHAXSIYAT QOIDASI: Sizning yagona va haqiqiy ismingiz FAQAT "${botName}". Siz HECH QACHON o'zingizni boshqa ism bilan tanishtirmaysiz (masalan, Abdulaziz, Sardor, Jasur deb yozish MUTLAQO TAQIQLANADI). Matnda ismingizni aytish lozim bo'lsa, FAQAT "${botName}" ismini ishlating.`;

    let userPrompt = `Post sarlavhasi: "${postTitle || "Mulohaza"}"
Post matni:
"""${postContent.slice(0, 1000)}"""`;

    if (existingComments.length > 0) {
      userPrompt += `\n\nAvvalgi bildirilgan fikrlar: ${existingComments.slice(0, 3).join(" | ")}`;
      userPrompt += `\nYuqoridagi fikrlarni takrorlamagan holda, o'z xarakteringizga mos holda bitta teran, tabiiy izoh yozing:`;
    } else {
      userPrompt += `\nUshbu postga xarakteringizga mos bitta teran, tabiiy izoh yozing:`;
    }

    if (withSearch) {
      userPrompt += ` (Kerak bo'lsa, mavzu bo'yicha internetdagi eng yangi ma'lumot yoki faktni hisobga olib fikr bildiring).`;
    }

    let comment = "";
    try {
      comment = await this.callGemini(userPrompt, systemPrompt, {
        enableSearch: withSearch,
        isJson: false,
        temperature: deepReasoning ? 0.78 : 0.85,
      });
    } catch (err) {
      if (withSearch) {
        console.warn("[AI] Search comment generation failed, falling back to standard:", err);
        try {
          comment = await this.callGemini(userPrompt, systemPrompt, {
            enableSearch: false,
            isJson: false,
            temperature: deepReasoning ? 0.78 : 0.85,
          });
        } catch (innerErr) {
          console.warn("[AI] Comment generation failed, using offline fallback comment:", innerErr);
          const fallback = this.getOfflineFallbackComment(postTitle, postContent);
          return this.sanitizeAuthorIdentity(fallback, botName);
        }
      } else {
        console.warn("[AI] Comment generation failed, using offline fallback comment:", err);
        const fallback = this.getOfflineFallbackComment(postTitle, postContent);
        return this.sanitizeAuthorIdentity(fallback, botName);
      }
    }

    const trimmed = comment
      .replace(/^[\"']|[\"']$/g, "")
      .replace(/^(?:Komment|Izoh|Fikr):\s*/i, "")
      .trim();

    const finalResult = trimmed || this.getOfflineFallbackComment(postTitle, postContent);
    return this.sanitizeAuthorIdentity(finalResult, botName);
  }

  /**
   * Generate an organic reply to an existing comment in a discussion.
   */
  async generateReply(options: {
    botName: string;
    botRole: string;
    botPersona: string;
    writingStyle?: string;
    thoughtAngle?: string;
    postTitle?: string | null;
    postContent: string;
    parentCommentAuthor: string;
    parentCommentContent: string;
  }): Promise<string> {
    const {
      botName,
      botRole,
      botPersona,
      writingStyle = "Aniq, samimiy va fikrlovchi",
      thoughtAngle = "Amaliy tajriba",
      postTitle,
      postContent,
      parentCommentAuthor,
      parentCommentContent,
    } = options;

    const systemPrompt = `Siz muhokamada boshqa bir ishtirokchining fikriga mantiqiy, do'stona va asosli javob yozayotgan o'zbekistonlik mutaxassis va platforma a'zosisiz.
Ismingiz: ${botName} (${botRole})
Xarakteringiz: ${botPersona}
Uslubingiz: ${writingStyle}
Nuqtai nazaringiz: ${thoughtAngle}

MUHIM QOIDALAR:
1. Ishtirokchi (${parentCommentAuthor}) ning fikrini inkor qilmasdan, suhbatni mazmunli davom ettiring.
2. Agar savol berilgan bo'lsa, amaliy misol bilan javob bering.
3. Agar fikr bildirilgan bo'lsa, qo'shimcha bir nozik jihatni ochib bering yoki qiziqarli qarshi savol bering.
4. Qisqa va lo'nda bo'lsin: 1-3 ta ixcham jumla.
5. Soxta maqtov ("Qo'shilaman!", "Ajoyib!") yozmang, to'g'ridan-to'g'ri mavzuga kiring.
6. QAT'IY SHAXSIYAT QOIDASI: Sizning yagona va haqiqiy ismingiz FAQAT "${botName}". Siz HECH QACHON o'zingizni boshqa ism bilan tanishtirmaysiz.`;

    const userPrompt = `Mavzu (Post): "${postTitle || "Fikr"}"
Post mazmuni: "${postContent.slice(0, 400)}"
${parentCommentAuthor} ning izohi: "${parentCommentContent}"

Sizning javobingiz:`;

    let raw = "";
    try {
      raw = await this.callGemini(userPrompt, systemPrompt);
    } catch (err) {
      console.warn("[AI] Reply generation failed, using offline fallback reply:", err);
      const fallback = this.getOfflineFallbackReply(parentCommentContent);
      return this.sanitizeAuthorIdentity(fallback, botName);
    }

    const trimmed = raw.replace(/^[\"']|[\"']$/g, "").trim();
    const finalResult = trimmed || this.getOfflineFallbackReply(parentCommentContent);
    return this.sanitizeAuthorIdentity(finalResult, botName);
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
  "role": "Kasbi yoki unvoni (masalan: Full-Stack Dasturchi, UI/UX Dizayner, Mahsulot Menejeri, Growth Marketolog, Talaba)",
  "bio": "1-2 jumlali tabiiy shaxsiy bio (masalan: Yangi texnologiyalar va startaplarni sinab ko'rishni yaxshi ko'raman. Kitoblar va kod.)",
  "gender": "male" yoki "female",
  "persona": "Botning ichki yozish xarakteri: masalan: 'Jiddiy, tahliliy, nozik jihatlarni payqovchi, arxitektura va biznesga qiziqadi' yoki 'Quvnoq, samimiy, yosh startapchi'"
}`;

    const userPrompt = `Yangi qiziqarli o'zbek foydalanuvchisi profilini yarating. Mavjud band username-lar: ${existingHandles.slice(0, 30).join(", ")}. Ularni takrorlamang.`;

    let raw = "";
    try {
      raw = await this.callGemini(userPrompt, systemPrompt, { isJson: true });
    } catch (err) {
      console.warn("[AI] Profile generation failed, using offline fallback profile:", err);
      return this.getOfflineFallbackProfile(existingHandles);
    }

    const parsed = this.parseJsonSafe(raw, {
      name: "",
      handle: "",
      role: "",
      bio: "",
      gender: "male",
      persona: "",
    });

    if (!parsed.name || !parsed.handle) {
      return this.getOfflineFallbackProfile(existingHandles);
    }

    const seed = parsed.handle || Math.random().toString(36).substring(7);
    const avatarCollection = parsed.gender === "female" ? "personas" : "micah";
    const avatarUrl = `https://api.dicebear.com/7.x/${avatarCollection}/svg?seed=${encodeURIComponent(seed)}`;

    return {
      name: parsed.name,
      handle: parsed.handle.toLowerCase().replace(/[^a-z0-9_]/g, ""),
      role: parsed.role || "Go-getter",
      bio: parsed.bio || "Yangi imkoniyatlar va startaplar sari intiluvchi.",
      avatarUrl,
      persona: parsed.persona || "Samimiy, do'stona va fikr almashishga ochiq.",
    };
  }

  // ── Offline Fallbacks ────────────────────────────────────────────────────────

  private getOfflineFallbackPost(role?: string, topic?: string): {
    title: string;
    content: string;
    postType: "thought";
  } {
    const roles = role || "Go-getter";

    const topicsList = [
      {
        tag: "Arxitektura va Texnologiya",
        titles: [
          `Kod arxitekturasida soddalik: ${roles} nigohi`,
          `Overengineering tuzog'idan saqlanish usullari`,
          `Loyiha masshtablashganda texnik qarzdorlikni kamaytirish`,
          `Toza kod va modul strukturasining haqiqiy qiymati`,
          `Dasturlashda samaradorlikni oshirish: amaliy kuzatuvlar`,
          `Murakkab tizimlarni optimallashtirishda eng muhim qadamlar`
        ],
        intros: [
          `Katta loyihalar bilan ishlash jarayonida shunga amin bo'ldimki, eng yaxshi arxitektura — bu <strong>tushunish va saqlash oson bo'lgan</strong> yechimdir.`,
          `Ko'pincha biz hali muammo paydo bo'lmasdan turib uni ortiqcha murakkablashtirishga (overengineering) kirishamiz.`,
          `Dasturchi va muhandislar uchun eng muhim ko'nikmalardan biri — bu muammoning tub ildizini topish va eng sodda yo'l bilan yechishdir.`
        ],
        bodies: [
          `<p>Har bir modul va funksiya bitta aniq mas'uliyatni (KISS prinsipi) o'z bo'yniga olishi kerak. Ortiqcha qatlamlarni olib tashlash loyiha tezligini 30-40% ga oshiradi.</p><blockquote>Dizayn va kodda mukammallik nimadir qo'shishda emas, balki ortiqcha narsani olib tashlashda namoyon bo'ladi.</blockquote>`,
          `<p>Tizimni kichik va mustaqil qismlarga bo'lib ishlash kelajakdagi <code>bug</code>larni 2 barobar kamaytiradi. <mark>Asosiy urg'uni barqarorlikka bering.</mark></p>`
        ],
        outros: [
          `<p>Sizda loyihalaringizda kod murakkablashib ketishining oldini olish uchun qanday shaxsiy oltin qoidalaringiz bor?</p>`,
          `<p>Jamoangizda kod sifatini nazorat qilishda eng samarali yondashuv qaysi bo'ldi?</p>`
        ]
      },
      {
        tag: "Startap va Mahsulot",
        titles: [
          `MVP yaratishda birinchi 30 kun nimaga diqqat qaratish kerak?`,
          `Foydalanuvchilar bilan muloqot (CustDev) va mahsulot mosligi`,
          `Startapda birinchi daromadni shakllantirish va o'sish`,
          `G'oyadan haqiqiy mahsulotgacha: ${roles} tajribasidan`,
          `Raqamli mahsulotlarda foydalanuvchi ishonchini qozonish`,
          `O'zbekiston bozorida raqamli startapni yo'lga qo'yish saboqlari`
        ],
        intros: [
          `Startaplar olamida statistikaga ko'ra ko'plab loyihalar bozorda haqiqiy talab bo'lmagani uchun muvaffaqiyatsizlikka uchraydi.`,
          `Mahsulot yaratayotganda eng birinchi savol: <strong>"Biz kimning qaysi aniq og'riqli muammosini hal qilyapmiz?"</strong>`,
          `Ajoyib texnologiya qurish yetarli emas. Undan odamlar foydalanishi va real qiymat ko'rishi shart.`
        ],
        bodies: [
          `<p>Imkon qadar tezroq prototip (MVP) tayyorlab, uni <strong>real foydalanuvchilar qo'liga berish</strong> lozim. Murojaat va fikrlar (feedback) asosida takomillashtirish eng to'g'ri yo'ldir.</p><ul><li>Mijoz muammosini chuqur o'rganish</li><li>Funktsional doirani minimallashtirish</li><li>Tezkor iteratsiyalar o'tkazish</li></ul>`,
          `<p>Metriklarni to'g'ri kuzatish o'sishning asosidir. Qaysi xususiyat (feature) foydalanuvchilar tomonidan eng ko'p ishlatilayotganini tahlil qiling.</p><blockquote>Haqiqiy qiymat — bu mahsulotga foydalanuvchi qayta-qayta qaytib kelishidir.</blockquote>`
        ],
        outros: [
          `<p>O'z loyihangizda birinchi g'oyani bozorda qanday sinab ko'rgansiz?</p>`,
          `<p>Mahsulotingizda eng muhim burilish nuqtasi (pivot) nima bo'lgan?</p>`
        ]
      },
      {
        tag: "Mahsuldorlik va Shaxsiy Odatlar",
        titles: [
          `Ish tartibida 80/20 qoidasi (Pareto prinsipi) va diqqatni saqlash`,
          `Mutaxassislar uchun ertalabki tartib va energiya boshqaruvi`,
          `Ruhiy charchoq (Burnout) oldini olish: ${roles} maslahatlari`,
          `Kundalik 1% o'sish odati va vaqt taym-menedjmenti`,
          `Masofaviy ish (Remote work) sharoitida diqqatni jamlash`,
          `Shovqinli axborot makonida diqqatni saqlash san'ati`
        ],
        intros: [
          `Kun davomida doimiy band bo'lish — bu har doim ham samarali ishlashni anglatmaydi.`,
          `Zamonaviy axborot shovqinida eng muhim resurs bu vaqt emas, balki <strong>diqqat-e'tibor va ichki energiya</strong>dir.`,
          `Karyerada va shaxsiy rivojlanishda barqarorlik va intizom har qanday bir martalik turtkidan ustundir.`
        ],
        bodies: [
          `<p>Kunni eng qiyin va muhim 1 ta vazifa bilan boshlash (Eat that frog) qolgan barcha ishlarni yengillashtiradi.</p><blockquote>Har bir bildirishnoma (notification) miyaning fokusini buzadi va qayta tiklashga 20 daqiqa vaqt ketadi.</blockquote><p>Ish va dam olish orasida aniq chegaralarni belgilash uzoq masofada yuqori mahsuldorlikni ta'minlaydi.</p>`,
          `<p>Har kuni kamida 30-45 minut yangi bilim o'rganishga vaqt ajrating. <mark>Yillar davomida bu sizni o'z sohangizda yetakchiga aylantiradi.</mark></p>`
        ],
        outros: [
          `<p>Kunlik ish rejangizda diqqatingizni bo'ladigan eng katta omil nima?</p>`,
          `<p>Sizda mahsuldorlikni oshiradigan eng sevimli ilova yoki odatingiz qaysi?</p>`
        ]
      }
    ];

    const category = topicsList[Math.floor(Math.random() * topicsList.length)];
    const titleBase = category.titles[Math.floor(Math.random() * category.titles.length)];
    const intro = category.intros[Math.floor(Math.random() * category.intros.length)];
    const body = category.bodies[Math.floor(Math.random() * category.bodies.length)];
    const outro = category.outros[Math.floor(Math.random() * category.outros.length)];

    return {
      title: titleBase,
      content: `<p>${intro}</p>${body}${outro}`,
      postType: "thought" as const,
    };
  }

  private getOfflineFallbackComment(postTitle?: string | null, postContent?: string): string {
    const intros = [
      "Juda teran va o'ylantiruvchi fikr bildiribsiz.",
      "Aynan shu masalaga alohida urg'u berganingiz juda o'rinli bo'libdi.",
      "Mavzuga tajribangiz prizmasidan qaraganingiz juda qiziqarli.",
      "Amaliyotda ham bu yondashuv sezilarli natija beradi.",
      "Ushbu qarashga to'liq qo'shilaman."
    ];

    const observations = [
      "Biz ham yaqinda o'z loyihamizda shunga o'xshash vaziyatga duch kelgandik.",
      "Ko'pincha ko'pchilik bu nozik jihatni e'tibordan chetda qoldirib ketadi.",
      "Ayniqsa masshtablash bosqichida bu omil hal qiluvchi rol o'ynaydi.",
      "Aynan shu nuqtada to'g'ri qaror qabul qilish vaqt va resursni tejaydi.",
      "Tizimli yondashuv bo'lmasa, bu muammo keyinchalik murakkablashadi."
    ];

    const questionsOrConclusions = [
      "Kelgusida bu bo'yicha batafsil amaliy keyslarni ham kutib qolamiz!",
      "Sizningcha, bunga erishishda eng birinchi qadam nima bo'lishi kerak?",
      "Tajribangiz bilan bo'lishganingiz uchun rahmat!",
      "Keyingi postlaringizda ham shunday chuqur tahlillarni kutamiz.",
      "Shu masalada sizda yana qanday muqobil yechimlar bor?"
    ];

    const i = intros[Math.floor(Math.random() * intros.length)];
    const o = observations[Math.floor(Math.random() * observations.length)];
    const q = questionsOrConclusions[Math.floor(Math.random() * questionsOrConclusions.length)];

    return `${i} ${o} ${q}`;
  }

  private getOfflineFallbackReply(parentCommentContent?: string): string {
    const intros = [
      "Javobingiz va fikringiz uchun rahmat!",
      "O'rinli nuqtaga e'tibor qaratdingiz.",
      "Fikringizga to'liq qo'shilaman.",
      "Bu holatda yondashuv haqiqatdan ham muhim."
    ];

    const details = [
      "Ayniqsa amaliyotda bu sezilarli darajada ijobiy ta'sir ko'rsatadi.",
      "Bu masala bo'yicha turli qarashlar bor, lekin siz aytgan variant eng maqbuli.",
      "Shu bilan birga, jamoaviy muvofiqlik ham hal qiluvchi rol o'ynaydi.",
      "Kelajakda bu tajribani o'z ish jarayonimizda ham qo'llab ko'ramiz."
    ];

    const i = intros[Math.floor(Math.random() * intros.length)];
    const d = details[Math.floor(Math.random() * details.length)];

    return `${i} ${d}`;
  }

  private getOfflineFallbackProfile(existingHandles: string[]): {
    name: string;
    handle: string;
    role: string;
    bio: string;
    avatarUrl: string;
    persona: string;
  } {
    const profiles = [
      { name: "Sardor Rahimov", role: "Full-Stack Dasturchi", bio: "Yangi texnologiyalar va kod arxitekturasi bilan qiziquvchi.", gender: "male", persona: "Tahliliy va samimiy" },
      { name: "Madina Karimova", role: "UI/UX Dizayner", bio: "Foydalanuvchilarga qulay va chiroyli interfeyslar yarataman.", gender: "female", persona: "Ijodkor va diqqatli" },
      { name: "Temur Po'latov", role: "Mahsulot Menejeri", bio: "Startaplar, mahsulot metrikalari va jamoa boshqaruvi.", gender: "male", persona: "Tadbirkor va yetakchi" },
      { name: "Dilnoza Aliyeva", role: "Growth Marketolog", bio: "Raqamli marketing va mijozlarni jalb qilish strategiyalari.", gender: "female", persona: "Faol va kirishuvchan" },
      { name: "Azizbek Yoqubov", role: "Backend Injener", bio: "Yuqori yuklamali tizimlar va ma'lumotlar bazasi optimallashuvi.", gender: "male", persona: "Jiddiy va mantiqiy" },
      { name: "Kamola Ismoilova", role: "Frontend Dasturchi", bio: "React, Next.js va zamonaviy web interfeyslar ishqibozi.", gender: "female", persona: "Samimiy va izlanuvchan" },
      { name: "Umidjon Saidov", role: "Startap Asoschisi", bio: "Muammolarga innovatsion yechimlar izlash va jamoa shakllantirish.", gender: "male", persona: "Tadbirkor va jasur" },
    ];

    const chosen = profiles[Math.floor(Math.random() * profiles.length)];
    let handle = chosen.name.toLowerCase().replace(/[^a-z0-9]/g, "_");
    let count = 1;
    while (existingHandles.includes(handle)) {
      handle = `${chosen.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${count++}`;
    }

    const avatarCollection = chosen.gender === "female" ? "personas" : "micah";
    const avatarUrl = `https://api.dicebear.com/7.x/${avatarCollection}/svg?seed=${encodeURIComponent(handle)}`;

    return {
      name: chosen.name,
      handle,
      role: chosen.role,
      bio: chosen.bio,
      avatarUrl,
      persona: chosen.persona,
    };
  }
}

export const gemini = new GeminiClient();
