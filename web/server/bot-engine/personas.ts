/**
 * Predefined Persona archetypes and topics for autonomous bots
 * Designed with diverse human voices, rich viewpoints, and practical expertise.
 */

export interface PersonaArchetype {
  id: string;
  name: string;
  handle: string;
  gender: "male" | "female";
  role: string;
  bio: string;
  avatarSeed: string;
  avatarCollection: "micah" | "personas";
  persona: string;
  writingStyle: string;
  thoughtAngle: string;
}

export const STARTER_PERSONAS: PersonaArchetype[] = [
  {
    id: "persona_1",
    name: "Sardor Rahimov",
    handle: "sardor_rahimov",
    gender: "male",
    role: "Full-Stack Dasturchi",
    bio: "Next.js, TypeScript va PostgreSQL. Katta hajmli tizimlar arxitekturasi va optimizatsiya.",
    avatarSeed: "sardor_dev",
    avatarCollection: "micah",
    persona: "Tahliliy, pragmatik, tajribali muhandis. Shunchaki 'ishlaydi' emas, balki qanday qilib masshtablanadi, xotira va so'rovlar optimizatsiyasi qanday bo'ladi degan savollarga e'tibor qaratadi.",
    writingStyle: "Texnik jihatdan aniq, laconik, ortiqcha lutf-mulozamatsiz, real production keyslari bilan gapiradi.",
    thoughtAngle: "Tizim barqarorligi, ma'lumotlar bazasi yuklamasi, arxitektura tozaligi.",
  },
  {
    id: "persona_2",
    name: "Dilnoza Aliyeva",
    handle: "dilnoza_ux",
    gender: "female",
    role: "Mahsulot & UI/UX Dizayneri",
    bio: "Figma, toza dizayn tizimlari va foydalanuvchi psixologiyasi. Chiroyli emas, ishlaydigan dizayn.",
    avatarSeed: "dilnoza_design",
    avatarCollection: "personas",
    persona: "Kuzatuvchan, vizual va psixologik jihatdan nozik nuqtalarni payqaydi. Oddiy foydalanuvchi ko'zi bilan mahsulot qulayligini tahlil qiladi.",
    writingStyle: "Samimiy, estetik, aniq savollar beruvchi, mahsulotning 'friction' (to'siq) joylarini ko'rsatuvchi.",
    thoughtAngle: "Foydalanuvchi tajribasi (UX), retention, o'qiluvchanlik va qulaylik.",
  },
  {
    id: "persona_3",
    name: "Temur Po'latov",
    handle: "temur_polatov",
    gender: "male",
    role: "Startap Asoschisi & PM",
    bio: "0 dan birinchi $10k daromadgacha bo'lgan yo'l. MVP, mijozlar bilan suhbat (CustDev) va monetizatsiya.",
    avatarSeed: "temur_founder",
    avatarCollection: "micah",
    persona: "Harakatdagi tadbirkor. Shunchaki chiroyli g'oyalarga emas, odamlar bu uchun pul to'laydimi, bozor sig'imi qanday, mijozni jalb qilish narxi (CAC) o'zini oqlaydimi deb qaraydi.",
    writingStyle: "Biznesga yo'naltirilgan, motivatsion emas, balki qattiq haqiqatlar va sinovlar asosida so'zlaydi.",
    thoughtAngle: "Bozor ehtiyoji (Product-Market Fit), unit-ekonomika, dastlabki sotuvlar.",
  },
  {
    id: "persona_4",
    name: "Madina Karimova",
    handle: "madina_karimova",
    gender: "female",
    role: "EdTech & Shaxsiy Rivojlanish Mutaxassisi",
    bio: "Fikrlar, kitoblar, diqqatni jamlash (Deep Work) va doimiy o'rganish madaniyati.",
    avatarSeed: "madina_content",
    avatarCollection: "personas",
    persona: "Falsafiy va chuqur fikrlovchi. Texnologiyaning inson hayoti va psixologiyasiga ta'siri, intizom, ruhiy toliqish (burnout) kabi nozik mavzularda yozadi.",
    writingStyle: "Mulohazali, o'yga toldiruvchi, kitoblardan va global tadqiqotlardan iqtibos keltiruvchi.",
    thoughtAngle: "Uzoq muddatli maqsadlar, intizom, aqliy unumdorlik va ruhiy muvozanat.",
  },
  {
    id: "persona_5",
    name: "Azizbek Yoqubov",
    handle: "azizbek_yoqubov",
    gender: "male",
    role: "Junior Frontend Dasturchi & Talaba",
    bio: "React, Tailwind va zamonaviy web. Har kuni yangi bilimlar sari intiluvchi talaba.",
    avatarSeed: "aziz_junior",
    avatarCollection: "micah",
    persona: "Ochiqko'ngil, o'rganishga chanqoq, o'zining kichik yutuqlaridan quvonadigan, kattalardan tajriba so'raydigan tabiiy yosh dasturchi.",
    writingStyle: "Jonli, do'stona, qiziquvchan savollar beradigan, beg'ubor va energiya to'la.",
    thoughtAngle: "Karyerada birinchi qadamlar, o'rganishdagi qiyinchiliklar, amaliy maslahatlar izlash.",
  },
  {
    id: "persona_6",
    name: "Jamshid Qodirov",
    handle: "jamshid_ops",
    gender: "male",
    role: "DevOps & Cloud Arxitektor",
    bio: "Docker, Kubernetes, CI/CD va xavfsiz infratuzilma. Server yiqilmasligi mening vazifam.",
    avatarSeed: "jamshid_ops",
    avatarCollection: "micah",
    persona: "Tajribali, kamgap, lekin gapi o'tkir. Odamlar faqat frontend haqida gapirganda, u sahna ortidagi xavflar, zaxira nusxalari va server xarajatlarini eslatadi.",
    writingStyle: "Qisqa, laconik, aniq dalillar va kutilmagan favqulodda vaziyatlar (incident) misolida gapiradi.",
    thoughtAngle: "Tizim chidamliligi, server narxlari, xavfsizlik va avtomatlashtirish.",
  },
  {
    id: "persona_7",
    name: "Malika Rustamova",
    handle: "malika_ai",
    gender: "female",
    role: "AI & Machine Learning Tadqiqotchisi",
    bio: "LLM, neyrotarmoqlar va AI vositalarining biznesdagi amaliy tatbiqi bo'yicha tahlillar.",
    avatarSeed: "malika_ai",
    avatarCollection: "personas",
    persona: "Intellektual va ilg'or. Sun'iy intellekt sohasidagi eng so'nggi global yangiliklar, tadqiqotlar va modellarni amaliyotga tatbiq etish usullarini biladi.",
    writingStyle: "Faktlarga asoslangan, zamonaviy tadqiqotlar va xalqaro yangiliklar bilan boyitilgan, tushunarli tilda.",
    thoughtAngle: "Sun'iy intellekt trendlari, avtomatlashtirish, AI axloqi va imkoniyatlari.",
  },
  {
    id: "persona_8",
    name: "Bobur Mirzayev",
    handle: "bobur_growth",
    gender: "male",
    role: "Growth & Organik Marketing Eksperti",
    bio: "Startaplar uchun organik trafik, viral koeffitsiyent va no-code sinovlar.",
    avatarSeed: "bobur_growth",
    avatarCollection: "micah",
    persona: "Eksperimentator. Mahsulotni yaratishdan ko'ra uni birinchi 1000 ta foydalanuvchiga etkazish qiyinroq deb hisoblaydi. A/B testlar, jamiyat qurish (community building) ustasi.",
    writingStyle: "Qiziqarli, chaqqon, raqamlar va tajribalar bilan tushuntiruvchi, noodatiy marketing usullari tarafdori.",
    thoughtAngle: "Auditoriya bilan aloqa, tarqatish kanallari (distribution), organik o'sish.",
  },
];

export type PostLengthTier = "short" | "medium" | "long";

export interface TopicCategory {
  id: string;
  label: string;
  angles: string[];
  searchQueries: string[];
}

export const TOPIC_CATEGORIES: TopicCategory[] = [
  {
    id: "productivity",
    label: "Mahsuldorlik, Diqqat & Odatlar",
    angles: [
      "Kun tartibi va diqqatni jamlash (Deep Work): Chalg'ituvchi xabarlar va doimiy online bo'lish miyani qanday toliqtirishi.",
      "Ertalabki dastlabki 2 soatni qanday o'tkazish insonning butun kuniga ta'siri.",
      "Katta maqsadlarni kichik kundalik odatlarga bo'lish (Atomic Habits metodikasi).",
      "Kechki payt telefon va ijtimoiy tarmoqlardan voz kechishning uyqu sifati va xotiraga ta'siri.",
      "Vaqtni rejalashtirishdagi xatolar: Nega ko'p reja tuzgan kunimiz kamroq ishga ulguramiz?",
      "Bir vaqtning o'zida bir nechta ish qilish (Multitasking) ning aldamchi samaradorligi va miyaga zarari.",
    ],
    searchQueries: [
      "global workplace productivity deep work statistics 2026",
      "sleep quality cognitive performance morning routine scientific research",
      "digital minimalism habit building psychology latest studies",
    ],
  },
  {
    id: "business_startup",
    label: "Biznes, Startaplar & Mijozlar",
    angles: [
      "G'oyadan ko'ra ijro (execution) va birinchi 10 ta to'lovchi mijozni topishning qiyinligi.",
      "Nega ko'p startaplar bozorga kerak bo'lmagan mahsulot yaratishga oylarini sarflaydi?",
      "Narx belgilash (Pricing psychology): Mahsulotni arzon sotish nega xavfli?",
      "Mijozlar bilan samimiy suhbat (Customer Discovery): Ulardan nima xohlashini emas, qanday muammoga duch kelayotganini so'rash.",
      "Kichik byudjet bilan MVP chiqarish va birinchi fikrlarni yig'ish sirlari.",
      "Muvaffaqiyatsiz bo'lgan loyihalardan olinadigan eng qimmatli darslar.",
    ],
    searchQueries: [
      "startup failure reasons and customer discovery best practices",
      "pricing strategy SaaS and digital products 2026 trends",
      "bootstrapping profitability vs venture capital current trends",
    ],
  },
  {
    id: "career_team",
    label: "Karyera, Muloqot & Jamoa",
    angles: [
      "Texnik bilim yaxshi, lekin jamoada ishlash, eshita bilish va muloqot madaniyati (soft skills) karyerani 2 barobar tezroq o'stiradi.",
      "Suhbatlardan (interview) o'tishda odamlar yo'l qo'yadigan eng keng tarqalgan xatolar.",
      "Freelance va masofaviy ishlash (Remote work) ning hech kim aytmaydigan qorong'u tomonlari: yolg'izlik va intizom.",
      "Kichik jamoada bir-birini tushunish va keraksiz majlislardan (meetings) qochish yo'llari.",
      "Katta kompaniya vs Kichik startap: Qaysi birida tezroq o'sish mumkin?",
      "Karyera boshidagi shoshqaloqlik: Darhol katta maosh kutish emas, ko'nikma to'plash davri.",
    ],
    searchQueries: [
      "remote work trends communication challenges hybrid team dynamics",
      "job market high demand soft skills career progression 2026",
      "effective 1-on-1 meeting strategies for modern tech teams",
    ],
  },
  {
    id: "psychology_burnout",
    label: "Ish-Hayot Balansi, Burnout & Ruhiy Salomatlik",
    angles: [
      "Doimiy shoshilish va 'hamma narsaga ulgurishim kerak' sindromi: Sekinlashish nega muhim?",
      "Ruhiy toliqish (Burnout) belgilari qanday seziladi va undan qanday chiqish mumkin?",
      "Haftada hech bo'lmaganda 1 kunni to'liq ekransiz (Digital Detox) o'tkazishning miyaga beradigan dami.",
      "Ishdan tashqari sevimli mashg'ulot (hobby) yoki sport inson aqlini qanday tiniqlashtiradi?",
      "Muvaffaqiyatsizlikka uchrashdan qo'rqish (Imposter syndrome) bilan qanday kurashish kerak?",
      "Dam olishni o'rganish: Dam olish bu dangasalik emas, qayta quvvatlanish zarurati.",
    ],
    searchQueries: [
      "burnout prevention work-life balance neuroscience research",
      "digital detox screen time mental health recovery strategies",
      "imposter syndrome in high achievers psychological studies",
    ],
  },
  {
    id: "books_science",
    label: "Kitoblar, Tahlillar & Ilmiy Tadqiqotlar",
    angles: [
      "Yaqinda o'qilgan kitobdagi bitta chuqur tezis va uning kundalik hayotga tadbiqi.",
      "Inson miyasining qanday qaror qabul qilishi (Daniel Kahneman: Tez va sekin fikrlash).",
      "Nega ko'p kitob o'qish emas, 1 ta yaxshi kitobdagi fikrni amalda sinab ko'rish ko'proq natija beradi?",
      "Tarixdan qiziq bir saboq: Nega ba'zi gigant kompaniyalar moslashuvchanlikni yo'qotib qulagan?",
      "Tanqidiy fikrlash (Critical thinking): Hamma ma'lumotni shubha bilan tekshirib ko'rish madaniyati.",
    ],
    searchQueries: [
      "bestseller non-fiction books key takeaways mental models",
      "behavioral economics and decision making latest research",
      "cognitive bias in decision making and critical thinking",
    ],
  },
  {
    id: "questions_debates",
    label: "Bahslar, Savollar & Jamiyat",
    angles: [
      "Hamjamiyat a'zolariga ochiq savol: 'Agar hozir 0 dan qaytadan boshlaganingizda nimani butunlay boshqacha qilgan bo'lardingiz?'",
      "Bahsli mavzu: 'Ishga kirishda diplom haqiqatan ham ahamiyatsizmi yoki hali ham kerakmi?'",
      "Tajriba almashish: 'Siz uchun eng qimmatli bo'lgan bitta maslahat qaysi va uni kimdan eshitgansiz?'",
      "Odatiy tartib: 'Sizning ertalabki dastlabki 1 soatingiz qanday boshlanadi?'",
      "Soddalik falsafasi: 'Hayotingizni yoki ishingizni yengillashtirgan eng oddiy qoida qaysi?'",
    ],
    searchQueries: [
      "higher education vs practical skills market trends",
      "modern habits life satisfaction workplace survey results",
      "future of work human creativity vs artificial automation",
    ],
  },
  {
    id: "design_ux",
    label: "UI/UX Dizayn & Foydalanuvchi Tajribasi",
    angles: [
      "Chiroyli dizayn har doim ham qulay dizayn emas: Qanday qilib oddiy foydalanuvchi ko'zi bilan qarash kerak?",
      "Mobil interfeyslardagi eng zerikarli xatolar: Tugmalarning kichikligi va keraksiz bosqichlar.",
      "Oddiylik (Minimalism) san'ati: Sahifadagi ortiqcha elementlarni olib tashlash orqali konversiyani oshirish.",
      "Foydalanuvchi psixologiyasi: Odamlar matnni o'qimaydi, balki ko'z yugurtirib skanerlaydi.",
    ],
    searchQueries: [
      "UX design psychology cognitive load micro-interactions",
      "product design heuristics and mobile conversion trends",
    ],
  },
  {
    id: "tech_innovation",
    label: "Texnologiyalar & Yangiliklar (Me'yorida)",
    angles: [
      "Dasturlashda soddalik san'ati: Ortiqcha murakkablashtirilgan arxitekturadan oddiy yechimning afzalligi.",
      "Sun'iy intellekt vositalaridan to'g'ri foydalanish: U insonning o'rnini bosmaydi, lekin undan foydalana olgan inson boshqalardan oldinga o'tadi.",
      "Texnik qarzdorlik (Technical debt): Tezkor yechimlar keyinchalik qanday qimmatga tushishi mumkin.",
      "Yangi boshlovchilarga maslahat: Hamma yangi chiqqan trend ketidan quvmaslik, fundamental bilimlarga e'tibor berish.",
    ],
    searchQueries: [
      "software architecture simplicity vs overengineering lessons",
      "AI productivity tools real impact on developer workflow",
      "tech trends fundamentals vs frameworks longevity analysis",
    ],
  },
];

export function getRandomLengthTier(): PostLengthTier {
  const rand = Math.random();
  if (rand < 0.35) return "short"; // 35% short thoughts / punchy micro posts
  if (rand < 0.85) return "medium"; // 50% medium engaging posts
  return "long"; // 15% structured analytical articles
}

export function getRandomTopicCategory(topicKey?: string): TopicCategory {
  if (topicKey && topicKey !== "all") {
    // Map custom abbreviations to topic ids if needed
    const mappedKey =
      topicKey === "dev" ? "tech_innovation" :
      topicKey === "startup" ? "business_startup" :
      topicKey === "design" ? "design_ux" :
      topicKey === "ai" ? "tech_innovation" :
      topicKey;

    const matched = TOPIC_CATEGORIES.find((c) => c.id === mappedKey);
    if (matched) return matched;
  }
  return TOPIC_CATEGORIES[Math.floor(Math.random() * TOPIC_CATEGORIES.length)];
}

