import pg from "pg";
import * as fs from "fs";
import * as path from "path";

// Read .env
const envPath = path.resolve(process.cwd(), ".env");
let databaseUrl = process.env.DATABASE_URL;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("DATABASE_URL=")) {
      databaseUrl = trimmed.substring("DATABASE_URL=".length).replace(/^["']|["']$/g, "");
    }
  }
}

const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

const authors = [
  {
    phone: "+998901234567",
    name: "Alisher Qodirov",
    handle: "alisher",
    role: "Senior Frontend Engineer & Product Architect",
    bio: "Foydalanuvchi tajribasi (UX), murakkab web-arxitektura va O‘zbekiston texnologik ekotizimida sifatli dasturiy ta’minot yaratish madaniyati haqida yozaman.",
    verified: true,
    isOnboarded: true,
  },
  {
    phone: "+998901112233",
    name: "Botir Ziyatov",
    handle: "bziyatov",
    role: "Senior Software Architect",
    bio: "Taqsimlangan tizimlar, microservices va yuqori yuklamali backend infratuzilmalari.",
    verified: true,
    isOnboarded: true,
  },
  {
    phone: "+998902223344",
    name: "Dilnoza Karimova",
    handle: "dilnoza_ux",
    role: "Principal Product Designer",
    bio: "Mahalliy ilovalar uchun foydalanuvchi tajribasi, microcopy va dizayn-tizimlar.",
    verified: true,
    isOnboarded: true,
  },
  {
    phone: "+998903334455",
    name: "Rustam Saidov",
    handle: "rustam_tech",
    role: "Startap asoschisi & Muhandis",
    bio: "MVP dan to‘liq masshtabgacha bo‘lgan startap bosqichlari haqida real tajribalar.",
    verified: false,
    isOnboarded: true,
  },
  {
    phone: "+998904445566",
    name: "Akmal Qosimov",
    handle: "akmal_ai",
    role: "AI tadqiqotchisi",
    bio: "O‘zbek tili uchun NLP va katta til modellari (LLM) tadqiqoti.",
    verified: true,
    isOnboarded: true,
  },
];

const postsData = [
  {
    authorHandle: "bziyatov",
    title: "Murakkablikka qarshi intizom: dasturiy ta'minotda YAGNI tamoyili",
    content:
      "Katta loyihalarda eng muhim mahorat — haddan tashqari ko‘p abstraksiya qurish emas, balki ortiqcha murakkablikni (unnecessary complexity) o‘z vaqtida rad eta olishdir.\n\nKo‘pincha jamoalar 'kelajakda kerak bo‘lib qolishi mumkin' deb tizimni 5 barobar og‘irlashtirib yuboradi. Haqiqiy professional muhandislik — minimal vositalar bilan maksimal barqarorlikka erishishdir.",
    readingTimeMinutes: 3,
    likesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    viewsCount: 0,
  },
  {
    authorHandle: "dilnoza_ux",
    title: "O‘zbek tilidagi microcopy va raqamli interfeyslar madaniyati",
    content:
      "Mahalliy ilovalarimizda duch kelinadigan eng og‘riqli nuqta — tarjima qilingan so‘zlarning interfeys kontekstiga mos kelmasligi.\n\nHar bir tugmaga 'Yuborish' deb yozavermasdan, amaliy kontekstga qarab 'Ulashish', 'Saqlash', 'Tasdiqlash' yoki 'Hisob yaratish' deb yozilsa, foydalanuvchining aqliy yuki (cognitive load) ancha yengillashadi. Mahsulot tili — uning hurmati.",
    readingTimeMinutes: 2,
    likesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    viewsCount: 0,
  },
  {
    authorHandle: "rustam_tech",
    title: "Birinchi mijozlarni topishda 6 oylik 'yopiq eshiklar' xatosi",
    content:
      "Startap boshlayotgan yoshlarda keng tarqalgan xato: 6 oy davomida hech kimga ko‘rsatmasdan, o‘z tasavvuridagi 'mukammal' mahsulotni yaratishga berilib ketish.\n\nBozorga chiqqach esa kutilmagan haqiqat bilan yuzlashishadi — odamlar umuman boshqa muammoga yechim qidirayotgan bo‘ladi. Birinchi haftadayoq real odamlar bilan suhbatlashing.",
    readingTimeMinutes: 2,
    likesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    viewsCount: 0,
  },
  {
    authorHandle: "akmal_ai",
    title: "O‘zbek tili uchun LLM modellari: sifatli ma'lumotlar tanqisligi",
    content:
      "Mahalliy sun'iy intellekt yechimlarini rivojlantirishdagi eng katta to‘siq hisoblash quvvati emas, balki toza, xatosiz, ilmiy va badiiy boy o‘zbekcha matnlar korpusining yetishmasligidir.\n\nFikr kabi platformalarda yuqori sifatli tahliliy yozuvlar ko‘payishi — kelajakdagi o‘zbek tili modellarining intellektual darajasini belgilab beradi.",
    readingTimeMinutes: 2,
    likesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    viewsCount: 0,
  },
];

async function seed() {
  const client = await pool.connect();
  try {
    console.log("Seeding initial authors into Neon...");
    const userMap = new Map();

    for (const a of authors) {
      const res = await client.query(
        `
        INSERT INTO "users" (phone, handle, name, role, bio, verified, is_onboarded)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (phone) DO UPDATE SET
          handle = EXCLUDED.handle,
          name = EXCLUDED.name,
          role = EXCLUDED.role,
          bio = EXCLUDED.bio,
          verified = EXCLUDED.verified,
          is_onboarded = EXCLUDED.is_onboarded
        RETURNING id, handle;
      `,
        [a.phone, a.handle, a.name, a.role, a.bio, a.verified, a.isOnboarded]
      );
      userMap.set(res.rows[0].handle, res.rows[0].id);
      console.log(` - User @${a.handle} saved (id: ${res.rows[0].id})`);
    }

    console.log("\nSeeding initial posts...");
    for (const p of postsData) {
      const authorId = userMap.get(p.authorHandle);
      if (!authorId) continue;

      const postRes = await client.query(
        `
        INSERT INTO "posts" (author_id, title, content, reading_time_minutes, likes_count, comments_count, shares_count)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, title;
      `,
        [authorId, p.title, p.content, p.readingTimeMinutes, p.likesCount, p.commentsCount, p.sharesCount]
      );
      console.log(` - Post: "${postRes.rows[0].title.slice(0, 40)}..." (id: ${postRes.rows[0].id})`);
    }

    console.log("\nDatabase seeding completed successfully!");
  } catch (err) {
    console.error("Seeding error:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
